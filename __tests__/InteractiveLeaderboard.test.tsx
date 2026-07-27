import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InteractiveLeaderboard from '../app/dashboard/InteractiveLeaderboard';

// Mock the confetti library so it doesn't crash the test environment
jest.mock('canvas-confetti', () => jest.fn());

describe('InteractiveLeaderboard Component', () => {
  // 1. Setup Mock Functions (Simulating our database actions)
  const mockUpdatePoints = jest.fn();
  const mockDeleteUser = jest.fn();
  const mockResetPoints = jest.fn();
  const mockChangeRole = jest.fn();

  // 2. Setup Mock Data
  const mockLeaderboard = [
    { id: 'user-1', name: 'John Doe', role: 'employee', total_points: 150 },
    { id: 'user-2', name: 'Jane Smith', role: 'employee', total_points: 120 },
  ];

  const mockManagers = [
    { id: 'mgr-1', name: 'Boss Man', role: 'store_manager', total_points: 0 }
  ];

  beforeEach(() => {
    // Clear mocks before each test runs
    jest.clearAllMocks();
    // Mock the browser's window.confirm popup so it automatically clicks "Yes"
    window.confirm = jest.fn(() => true);
  });

  it('renders the leaderboard with correct user data', () => {
    render(
      <InteractiveLeaderboard 
        leaderboard={mockLeaderboard} 
        managers={mockManagers} 
        userRole="employee" 
        storeId={1}
        updatePoints={mockUpdatePoints}
        deleteUser={mockDeleteUser}
        resetPoints={mockResetPoints}
        changeRole={mockChangeRole}
      />
    );

    // Verify users are on the screen
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('hides manager controls from regular employees', () => {
    render(
      <InteractiveLeaderboard 
        leaderboard={mockLeaderboard} 
        managers={mockManagers} 
        userRole="employee" 
        storeId={1}
        updatePoints={mockUpdatePoints}
        deleteUser={mockDeleteUser}
        resetPoints={mockResetPoints}
        changeRole={mockChangeRole}
      />
    );

    // Employees should not see the "Manage" column or Add/Minus buttons
    expect(screen.queryByText('Manage')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Add Points')).not.toBeInTheDocument();
  });

  it('shows manager controls for store managers', () => {
    render(
      <InteractiveLeaderboard 
        leaderboard={mockLeaderboard} 
        managers={mockManagers} 
        userRole="store_manager" 
        storeId={1}
        updatePoints={mockUpdatePoints}
        deleteUser={mockDeleteUser}
        resetPoints={mockResetPoints}
        changeRole={mockChangeRole}
      />
    );

    // Store managers SHOULD see the add points button
    expect(screen.getAllByTitle('Add Points').length).toBeGreaterThan(0);
    expect(screen.getByText('Reset All Points')).toBeInTheDocument();
  });

  it('opens the modal and submits points successfully', async () => {
    render(
      <InteractiveLeaderboard 
        leaderboard={mockLeaderboard} 
        managers={mockManagers} 
        userRole="store_manager" 
        storeId={1}
        updatePoints={mockUpdatePoints}
        deleteUser={mockDeleteUser}
        resetPoints={mockResetPoints}
        changeRole={mockChangeRole}
      />
    );

    // 1. Click the "+" button for the first user
    const addButtons = screen.getAllByTitle('Add Points');
    fireEvent.click(addButtons[0]); // Clicks John Doe's Add button

    // 2. Verify modal opened
    expect(screen.getByText('Award Points')).toBeInTheDocument();
    expect(screen.getByText('Updating ledger for')).toBeInTheDocument();

    // 3. Type a reason into the input field
    const reasonInput = screen.getByPlaceholderText('e.g., Deep cleaned');
    await userEvent.type(reasonInput, 'Covered a weekend shift');

    // 4. Change the points dropdown to 3
    // The background table has role dropdowns, so we grab all of them and pick the last one (the modal)
    const allComboboxes = screen.getAllByRole('combobox');
    const selectPoint = allComboboxes[allComboboxes.length - 1];
    await userEvent.selectOptions(selectPoint, '3');

    // 5. Submit the form
    const submitButton = screen.getByText('Confirm');
    fireEvent.click(submitButton);

    // 6. Verify the database function was called with the right data
    await waitFor(() => {
      expect(mockUpdatePoints).toHaveBeenCalledTimes(1);
      expect(mockUpdatePoints).toHaveBeenCalledWith(
        'user-1', // user id
        3,        // points
        'Covered a weekend shift' // reason
      );
    });
  });

  it('calls deleteUser when manager removes an employee', async () => {
    render(
      <InteractiveLeaderboard 
        leaderboard={mockLeaderboard} 
        managers={mockManagers} 
        userRole="store_manager" 
        storeId={1}
        updatePoints={mockUpdatePoints}
        deleteUser={mockDeleteUser}
        resetPoints={mockResetPoints}
        changeRole={mockChangeRole}
      />
    );

    // Click the delete button for John Doe
    const deleteButtons = screen.getAllByTitle('Delete Employee');
    fireEvent.click(deleteButtons[0]);

    // Verify window.confirm was triggered and the DB function was called
    expect(window.confirm).toHaveBeenCalled();
    expect(mockDeleteUser).toHaveBeenCalledWith('user-1');
  });
});