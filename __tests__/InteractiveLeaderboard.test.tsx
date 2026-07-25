import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import InteractiveLeaderboard from '../app/dashboard/InteractiveLeaderboard';

// MOCK DATA: Creating fake users to test with
const mockLeaderboard = [
  { id: '1', name: 'Alice Employee', role: 'employee', total_points: 50 },
  { id: '2', name: 'Bob Shift Leader', role: 'shift_leader', total_points: 75 }
];

const mockManagers = [
  { id: '3', name: 'Charlie Manager', role: 'store_manager', total_points: 0 }
];

// MOCK FUNCTIONS: Fake server actions to see if the UI triggers them correctly
const mockUpdatePoints = jest.fn();
const mockDeleteUser = jest.fn();
const mockResetPoints = jest.fn();
const mockChangeRole = jest.fn();

describe('InteractiveLeaderboard Glitch & Security Tests', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
    window.confirm = jest.fn(() => true); // Auto-clicks "Yes" on confirmation popups
    window.alert = jest.fn(); // Mocks the alert boxes
  });

  // TEST 1: The "Visibility Loophole"
  it('SECURITY: Regular employees should NOT see any manager action buttons (+, -, Delete, Role Change)', () => {
    render(
      <InteractiveLeaderboard 
        leaderboard={mockLeaderboard} 
        managers={mockManagers} 
        userRole="employee" // Logged in as regular employee
        updatePoints={mockUpdatePoints}
        deleteUser={mockDeleteUser}
        resetPoints={mockResetPoints}
        storeId={1}
        changeRole={mockChangeRole}
      />
    );

    // Assert that the action buttons literally do not exist on the screen
    expect(screen.queryByTitle('Add Points')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Delete Employee')).not.toBeInTheDocument();
    expect(screen.queryByText('Reset All Points')).not.toBeInTheDocument();
  });

  // TEST 2: The "Area Manager Deletion Glitch"
  it('SECURITY: Only Area Managers can delete Store Managers', () => {
    const { rerender } = render(
      <InteractiveLeaderboard 
        leaderboard={mockLeaderboard} 
        managers={mockManagers} 
        userRole="store_manager" // Logged in as Store Manager
        updatePoints={mockUpdatePoints}
        deleteUser={mockDeleteUser}
        resetPoints={mockResetPoints}
        storeId={1}
        changeRole={mockChangeRole}
      />
    );

    // Store manager should NOT see the X button next to another Store Manager
    expect(screen.queryByTitle('Remove Manager')).not.toBeInTheDocument();

    // Rerender the screen as an Area Manager
    rerender(
      <InteractiveLeaderboard 
        leaderboard={mockLeaderboard} 
        managers={mockManagers} 
        userRole="area_manager" // Logged in as Area Manager
        updatePoints={mockUpdatePoints}
        deleteUser={mockDeleteUser}
        resetPoints={mockResetPoints}
        storeId={1}
        changeRole={mockChangeRole}
      />
    );

    // Area manager SHOULD see the X button
    expect(screen.getByTitle('Remove Manager')).toBeInTheDocument();
  });

  // TEST 3: Testing the Role Change function
  it('FUNCTIONALITY: Changing a role triggers the backend server action', async () => {
    render(
      <InteractiveLeaderboard 
        leaderboard={mockLeaderboard} 
        managers={mockManagers} 
        userRole="area_manager" 
        updatePoints={mockUpdatePoints}
        deleteUser={mockDeleteUser}
        resetPoints={mockResetPoints}
        storeId={1}
        changeRole={mockChangeRole}
      />
    );

    // Find the dropdown for Alice (who is currently an employee)
    const roleDropdowns = screen.getAllByRole('combobox');
    const aliceDropdown = roleDropdowns[0];

    // Simulate a manager selecting "shift_leader"
    await userEvent.selectOptions(aliceDropdown, 'shift_leader');

    // Verify the server action was called with Alice's ID ('1') and the new role
    expect(mockChangeRole).toHaveBeenCalledWith('1', 'shift_leader');
  });

  // TEST 4: The "Negative Points Glitch"
  it('FUNCTIONALITY: Point deductions correctly send negative values to the database', async () => {
    render(
      <InteractiveLeaderboard 
        leaderboard={mockLeaderboard} 
        managers={mockManagers} 
        userRole="store_manager" 
        updatePoints={mockUpdatePoints}
        deleteUser={mockDeleteUser}
        resetPoints={mockResetPoints}
        storeId={1}
        changeRole={mockChangeRole}
      />
    );

    // Click the Deduct (-) button for Alice
    const deductButtons = screen.getAllByTitle('Deduct Points');
    fireEvent.click(deductButtons[0]);

    // Fill out the modal
    const reasonInput = screen.getByPlaceholderText('e.g., Deep cleaned');
    await userEvent.type(reasonInput, 'Late to shift');
    
    // Select 5 points
    const amountSelect = screen.getAllByRole('combobox')[2]; // The modal select
    await userEvent.selectOptions(amountSelect, '5');

    // Submit the form
    const confirmButton = screen.getByText('Confirm');
    fireEvent.click(confirmButton);

    // VERIFY: The server action MUST receive -5, not 5.
    await waitFor(() => {
      expect(mockUpdatePoints).toHaveBeenCalledWith('1', -5, 'Late to shift');
    });
  });

  // TEST 5: The Manual Reset Verification
  it('FUNCTIONALITY: The Reset button successfully triggers the wipe for the correct store', async () => {
    render(
      <InteractiveLeaderboard 
        leaderboard={mockLeaderboard} 
        managers={mockManagers} 
        userRole="store_manager" 
        updatePoints={mockUpdatePoints}
        deleteUser={mockDeleteUser}
        resetPoints={mockResetPoints}
        storeId={1} // The current active store
        changeRole={mockChangeRole}
      />
    );

    // Find and click the Reset button
    const resetButton = screen.getByText('Reset All Points');
    fireEvent.click(resetButton);

    // Verify the server action was called with the correct Store ID (1)
    await waitFor(() => {
      expect(mockResetPoints).toHaveBeenCalledWith(1);
    });
  });
});