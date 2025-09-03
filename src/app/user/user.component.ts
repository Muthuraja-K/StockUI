import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from './user.service';
import { AuthService, User } from '../auth/auth.service';

// Interface for new user creation (includes password)
interface NewUser {
  username: string;
  password: string;
  role: 'admin' | 'user';
  firstname: string;
  lastname: string;
}

@Component({
  selector: 'user',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.scss'],
})
export class UserComponent implements OnInit {
  users: User[] = [];
  loading = false;
  filterUsername = '';
  showAddUserForm = false;
  showEditUserForm = false;
  selectedUser: User | null = null;
  currentUser: User | null = null;
  
  // Custom dialog properties
  showConfirmModal = false;
  confirmTitle = '';
  confirmMessage = '';
  confirmCallback: (() => void) | null = null;
  
  showSuccessModal = false;
  successTitle = '';
  successMessage = '';
  
  showErrorModal = false;
  errorTitle = '';
  errorMessage = '';
  
  newUser: NewUser = {
    username: '',
    password: '',
    role: 'user',
    firstname: '',
    lastname: ''
  };
  
  editUser: NewUser = {
    username: '',
    password: '',
    role: 'user',
    firstname: '',
    lastname: ''
  };

  constructor(
    private userService: UserService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.currentUserValue;
    this.loadUsers();
  }

  // Check if current user is admin/superuser
  get isAdmin(): boolean {
    return this.currentUser?.role === 'admin';
  }

  // Check if current user is superuser (username: "superuser")
  get isSuperuser(): boolean {
    return this.currentUser?.username === 'superuser';
  }

  // Check if current user is any type of admin (including superuser)
  get isAnyAdmin(): boolean {
    return this.currentUser?.role === 'admin';
  }

  // Check if current user can see all users
  get canSeeAllUsers(): boolean {
    return this.isAnyAdmin; // Both superuser and regular admin can see users (with restrictions)
  }

  // Check if current user can add users
  get canAddUsers(): boolean {
    return this.isAnyAdmin;
  }

  // Check if current user can edit a specific user
  canEditUser(user: User): boolean {
    if (this.isSuperuser) return true; // Superuser can edit anyone
    
    if (this.isAdmin) {
      // Regular admin can only edit regular users (not other admins)
      return user.role === 'user';
    }
    
    // Regular users can only edit their own profile
    return this.currentUser?.username === user.username;
  }

  // Check if current user can delete a specific user
  canDeleteUser(user: User): boolean {
    if (this.isSuperuser) {
      // Superuser can delete anyone except themselves
      return this.currentUser?.username !== user.username;
    }
    
    if (this.isAdmin) {
      // Regular admin can only delete regular users (not other admins)
      return user.role === 'user';
    }
    
    // Regular users cannot delete any users
    return false;
  }

  // Check if current user can change roles
  get canChangeRole(): boolean {
    return this.isSuperuser; // Only superuser can change roles
  }

  // Check if current user can see a specific user
  canSeeUser(user: User): boolean {
    if (this.isSuperuser) return true; // Superuser can see everyone
    
    if (this.isAdmin) {
      // Regular admin can only see regular users (not other admins)
      return user.role === 'user';
    }
    
    // Regular users can only see themselves
    return this.currentUser?.username === user.username;
  }

  // Check if current user can add admin users
  get canAddAdminUsers(): boolean {
    return this.isSuperuser; // Only superuser can add admin users
  }

  loadUsers() {
    this.loading = true;
    
    if (this.canSeeAllUsers) {
      // Admin users can see users, but with restrictions
      this.userService.getUsers(this.filterUsername).subscribe({
        next: (response) => {
          let allUsers = response.results || [];
          
          // Apply access restrictions based on user type
          if (this.isSuperuser) {
            // Superuser can see all users
            this.users = allUsers;
          } else if (this.isAdmin) {
            // Regular admin can see regular users + their own information
            let regularUsers = allUsers.filter((user: any) => user.role === 'user');
            // Add current admin user if not already in the list
            if (this.currentUser && !regularUsers.find((u: User) => u.username === this.currentUser?.username)) {
              regularUsers.push(this.currentUser);
            }
            this.users = regularUsers;
          } else {
            // Regular users can only see themselves
            this.users = this.currentUser ? [this.currentUser] : [];
          }
          
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading users:', error);
          this.loading = false;
          this.showError('Error', 'Failed to load users. Please try again.');
        }
      });
    } else {
      // Regular users can only see their own information
      if (this.currentUser) {
        this.users = [this.currentUser];
        this.loading = false;
      } else {
        this.users = [];
        this.loading = false;
      }
    }
  }

  searchUsers() {
    if (this.canSeeAllUsers) {
      this.loadUsers();
    } else {
      // Regular users don't need search functionality
      console.log('Search not available for regular users');
    }
  }

  clearFilter() {
    this.filterUsername = '';
    if (this.canSeeAllUsers) {
      this.loadUsers();
    }
  }

  showAddForm() {
    if (!this.canAddUsers) {
      this.showError('Permission Denied', 'You do not have permission to add users');
      return;
    }
    this.showAddUserForm = true;
    this.showEditUserForm = false;
    this.resetNewUserForm();
  }

  showEditForm(user: User) {
    if (!this.canEditUser(user)) {
      this.showError('Permission Denied', 'You do not have permission to edit this user');
      return;
    }
    this.selectedUser = user;
    this.editUser = { 
      ...user, 
      password: '' // Password field is required for NewUser interface
    };
    this.showEditUserForm = true;
    this.showAddUserForm = false;
  }

  hideForms() {
    this.showAddUserForm = false;
    this.showEditUserForm = false;
    this.selectedUser = null;
    this.resetNewUserForm();
  }

  resetNewUserForm() {
    this.newUser = {
      username: '',
      password: '',
      role: 'user',
      firstname: '',
      lastname: ''
    };
  }

  addUser() {
    if (!this.canAddUsers) {
      this.showError('Permission Denied', 'You do not have permission to add users');
      return;
    }

    if (!this.newUser.username || !this.newUser.password) {
      this.showError('Validation Error', 'Username and password are required');
      return;
    }

    // Check if trying to add admin user without permission
    if (this.newUser.role === 'admin' && !this.canAddAdminUsers) {
      this.showError('Permission Denied', 'Only superuser can add admin users');
      return;
    }

    this.userService.addUser(this.newUser).subscribe({
      next: (response) => {
        this.showSuccess('Success', 'User added successfully');
        this.hideForms();
        this.loadUsers();
      },
      error: (error) => {
        console.error('Error adding user:', error);
        this.showError('Error', 'Failed to add user. Please try again.');
      }
    });
  }

  updateUser() {
    if (!this.selectedUser || !this.canEditUser(this.selectedUser)) {
      this.showError('Permission Denied', 'You do not have permission to edit this user');
      return;
    }

    if (!this.editUser.username) {
      this.showError('Validation Error', 'Username is required');
      return;
    }

    // Check role change permissions
    if (this.editUser.role !== this.selectedUser.role) {
      if (!this.canChangeRole) {
        this.showError('Permission Denied', 'You cannot change user roles');
        this.editUser.role = this.selectedUser.role;
        return;
      }
      
      // Prevent superuser from changing their own role
      if (this.isSuperuser && this.currentUser?.username === this.selectedUser.username) {
        this.showError('Permission Denied', 'You cannot change your own role');
        this.editUser.role = this.selectedUser.role;
        return;
      }
    }

    this.userService.updateUser(this.selectedUser.username, this.editUser).subscribe({
      next: (response) => {
        this.showSuccess('Success', 'User updated successfully');
        this.hideForms();
        this.loadUsers();
        
        // If user updated their own profile, refresh auth service
        if (this.currentUser?.username === this.selectedUser?.username) {
          this.authService.refreshUserData();
        }
      },
      error: (error) => {
        console.error('Error updating user:', error);
        this.showError('Error', 'Failed to update user. Please try again.');
      }
    });
  }

  deleteUser(username: string) {
    const userToDelete = this.users.find(u => u.username === username);
    
    if (!userToDelete || !this.canDeleteUser(userToDelete)) {
      this.showError('Permission Denied', 'You do not have permission to delete this user');
      return;
    }

    // Prevent users from deleting themselves
    if (this.currentUser?.username === username) {
      this.showError('Permission Denied', 'You cannot delete your own account');
      return;
    }

    this.showConfirm(
      'Confirm Deletion',
      `Are you sure you want to delete user: ${username}?`,
      () => this.performDeleteUser(username)
    );
  }

  performDeleteUser(username: string) {
    this.userService.deleteUser(username).subscribe({
      next: (response) => {
        this.showSuccess('Success', 'User deleted successfully');
        this.loadUsers();
      },
      error: (error) => {
        console.error('Error deleting user:', error);
        this.showError('Error', 'Failed to delete user. Please try again.');
      }
    });
  }

  getRoleClass(role: string): string {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'role-admin';
      case 'user':
        return 'role-user';
      default:
        return 'role-other';
    }
  }

  // Get display title based on user role
  getPageTitle(): string {
    if (this.isSuperuser) {
      return 'Superuser Management';
    } else if (this.isAdmin) {
      return 'User Management';
    } else {
      return 'My Profile';
    }
  }

  // Get display description based on user role
  getPageDescription(): string {
    if (this.isSuperuser) {
      return 'Manage all users including administrators';
    } else if (this.isAdmin) {
      return 'Manage regular users and your own profile';
    } else {
      return 'View and edit your profile information';
    }
  }

  // Get access level indicator
  getAccessLevel(): string {
    if (this.isSuperuser) {
      return 'Superuser Access';
    } else if (this.isAdmin) {
      return 'Admin Access (Regular Users + Own Profile)';
    } else {
      return 'User Access';
    }
  }

  // Custom dialog methods
  showConfirm(title: string, message: string, callback: () => void) {
    this.confirmTitle = title;
    this.confirmMessage = message;
    this.confirmCallback = callback;
    this.showConfirmModal = true;
  }

  closeConfirmModal() {
    this.showConfirmModal = false;
    this.confirmTitle = '';
    this.confirmMessage = '';
    this.confirmCallback = null;
  }

  confirmAction() {
    if (this.confirmCallback) {
      this.confirmCallback();
    }
    this.closeConfirmModal();
  }

  showSuccess(title: string, message: string) {
    this.successTitle = title;
    this.successMessage = message;
    this.showSuccessModal = true;
  }

  closeSuccessModal() {
    this.showSuccessModal = false;
    this.successTitle = '';
    this.successMessage = '';
  }

  showError(title: string, message: string) {
    this.errorTitle = title;
    this.errorMessage = message;
    this.showErrorModal = true;
  }

  closeErrorModal() {
    this.showErrorModal = false;
    this.errorTitle = '';
    this.errorMessage = '';
  }
}
