import { createMemoryHistory } from '@tanstack/react-router';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { api, resetMock } from '@/api';
import { navFor, type Role } from '@/lib/roles';
import App from '@/App';

const renderHandling = (role: Role = 'owner') =>
  render(
    <App role={role} history={createMemoryHistory({ initialEntries: ['/inventory/handling'] })} />,
  );

const openToril = async () => {
  await userEvent.click(await screen.findByRole('button', { name: /Open floor plan for Toril/ }));
};
const binButton = (code: string) =>
  screen.findByRole('button', { name: new RegExp(`^Bin ${code},`) });

beforeEach(() => {
  resetMock();
  localStorage.clear();
});

describe('Warehouse handling', () => {
  it('is the first Inventory item in the nav', () => {
    const inventory = navFor('owner').filter((n) => n.group === 'Inventory');
    expect(inventory[0]?.label).toBe('Warehouse handling');
  });

  it('shows one card per warehouse and one block per bin of the selected one', async () => {
    renderHandling();
    const { warehouses, bins } = await api.getWarehouseOverview();
    expect(await screen.findAllByRole('button', { name: /Open floor plan for/ })).toHaveLength(
      warehouses.length,
    );
    await openToril();
    const count = bins.filter((b) => b.warehouseId === 'wh-toril').length;
    expect(await screen.findAllByRole('button', { name: /^Bin / })).toHaveLength(count);
  });

  it('lists the lots of a clicked bin', async () => {
    renderHandling();
    await openToril();
    const { bins } = await api.getWarehouseOverview();
    const bin = bins.find((b) => b.id === 'wh-toril-A1')!;
    expect(bin.lots.length).toBeGreaterThan(0);
    await userEvent.click(await binButton('A1'));
    const panel = await screen.findByRole('region', { name: 'Bin A1 details' });
    expect(within(panel).getAllByRole('listitem')).toHaveLength(bin.lots.length);
  });

  it('hides the action buttons from a dispatcher', async () => {
    renderHandling('dispatcher');
    await openToril();
    await userEvent.click(await binButton('A1'));
    await screen.findByRole('region', { name: 'Bin A1 details' });
    expect(screen.queryByRole('link', { name: 'Receive into bin' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Transfer from bin' })).toBeNull();
  });

  it('opens Receiving and Transfers with the bin pre-selected', async () => {
    renderHandling();
    await openToril();
    await userEvent.click(await binButton('A1'));
    await userEvent.click(await screen.findByRole('link', { name: 'Receive into bin' }));
    await waitFor(() => expect(screen.getByLabelText('Bin')).toHaveValue('wh-toril-A1'));
  });

  it('opens Transfers with the source bin pre-selected', async () => {
    renderHandling();
    await openToril();
    await userEvent.click(await binButton('A2'));
    await userEvent.click(await screen.findByRole('link', { name: 'Transfer from bin' }));
    await waitFor(() => expect(screen.getByLabelText('From bin')).toHaveValue('wh-toril-A2'));
  });

  it("updates the bin's sacks after a receive", async () => {
    renderHandling();
    await openToril();
    await userEvent.click(await binButton('A1'));
    const before = (await api.getWarehouseOverview()).bins.find((b) => b.id === 'wh-toril-A1')!;
    await userEvent.click(await screen.findByRole('link', { name: 'Receive into bin' }));
    await screen.findByRole('option', { name: 'Mindanao Grains Cooperative' });
    await userEvent.selectOptions(screen.getByLabelText('Supplier'), 'sup-1');
    await userEvent.selectOptions(screen.getByLabelText('Product'), 'prod-1');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Existing lot' }), 'lot-1');
    await userEvent.type(screen.getByLabelText('Sacks'), '7');
    await userEvent.click(screen.getByRole('button', { name: 'Receive stock' }));
    await screen.findByText('Received 7 sacks.');
    await userEvent.click(screen.getByRole('link', { name: 'Warehouse handling' }));
    await openToril();
    expect(await binButton('A1')).toHaveAccessibleName(
      new RegExp(`^Bin A1, ${before.sacks + 7} sacks`),
    );
  });
});
