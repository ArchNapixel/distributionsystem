import { createMemoryHistory } from '@tanstack/react-router';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { api, resetMock } from '@/api';
import { ROLES, navFor, type Role } from '@/lib/roles';
import App from './App';

const renderAt = (path: string, role: Role = 'owner') =>
  render(<App role={role} history={createMemoryHistory({ initialEntries: [path] })} />);

beforeEach(() => {
  resetMock();
  localStorage.clear();
});

describe('role menus', () => {
  it.each(ROLES.map((r) => r.id))(
    '%s sees exactly the menu items from the matrix',
    async (role) => {
      renderAt(role === 'driver' ? '/driver' : '/dashboard', role);
      await screen.findByRole('heading', { level: 1 });
      const expected = navFor(role).map((n) => n.label);
      if (expected.length === 0) {
        expect(screen.queryByRole('navigation', { name: 'Main' })).toBeNull();
        return;
      }
      const nav = screen.getByRole('navigation', { name: 'Main' });
      const shown = within(nav)
        .getAllByRole('link')
        .map((a) => a.textContent?.replace(/P\d$/, ''));
      expect(shown).toEqual(expected);
    },
  );

  it('shows the demo-data badge', async () => {
    renderAt('/dashboard');
    expect(await screen.findByText('Demo data')).toBeInTheDocument();
  });

  it('shows "not available" on a forbidden route', async () => {
    renderAt('/inventory/adjustments', 'staff');
    expect(await screen.findByText('Not available for your role')).toBeInTheDocument();
  });
});

describe('Receiving form', () => {
  it('shows field errors on invalid input', async () => {
    renderAt('/inventory/receiving');
    await userEvent.click(await screen.findByRole('button', { name: 'Receive stock' }));
    expect(await screen.findAllByText('Select an option')).not.toHaveLength(0);
    expect(screen.getByText('Enter the number of sacks')).toBeInTheDocument();
  });

  it('posts a valid receipt into stock', async () => {
    const before = (await api.listStock()).reduce((n, b) => n + b.sacks, 0);
    renderAt('/inventory/receiving');
    await screen.findByRole('option', { name: 'Mindanao Grains Cooperative' });
    await userEvent.selectOptions(screen.getByLabelText('Supplier'), 'sup-1');
    await userEvent.selectOptions(screen.getByLabelText('Bin'), 'wh-toril-A1');
    await userEvent.selectOptions(screen.getByLabelText('Product'), 'prod-1');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Existing lot' }), 'lot-1');
    await userEvent.type(screen.getByLabelText('Sacks'), '7');
    await userEvent.click(screen.getByRole('button', { name: 'Receive stock' }));
    expect(await screen.findByText('Received 7 sacks.')).toBeInTheDocument();
    const after = (await api.listStock()).reduce((n, b) => n + b.sacks, 0);
    expect(after).toBe(before + 7);
  });
});

describe('Transfer form', () => {
  it('shows the insufficient-stock error', async () => {
    renderAt('/inventory/transfers');
    await screen.findAllByRole('option', { name: 'Toril Warehouse / A1' });
    await userEvent.selectOptions(screen.getByLabelText('From bin'), 'wh-toril-A1');
    await userEvent.selectOptions(screen.getByLabelText('To bin'), 'wh-toril-A2');
    await userEvent.selectOptions(screen.getByLabelText('Product'), 'prod-1');
    await userEvent.selectOptions(screen.getByLabelText('Lot'), 'lot-1');
    await userEvent.type(screen.getByLabelText('Sacks'), '5');
    await userEvent.click(screen.getByRole('button', { name: 'Transfer stock' }));
    expect(await screen.findByText(/Not enough stock/)).toBeInTheDocument();
  });
});
