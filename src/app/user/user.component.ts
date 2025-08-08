import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UserService } from './user.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'user',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.scss'],
})
export class UserComponent {
  users: { username: string; firstname: string; lastname: string; role: string; password: string }[] = [];

  editingIndex: number | null = null;
  newUser: { username: string; password: string; role: string; firstname: string; lastname: string } = {
    username: '',
    password: '',
    role: 'user',
    firstname: '',
    lastname: ''
  };
  filterUsername: string = '';
  currentPage = 1;
  pageSize = 10;
  total = 0;
  pageCount = 1;
  loading = false;
  showAddModal = false;
  showEditModal = false;
  editingUser: { username: string; password: string; role: string; firstname: string; lastname: string } = {
    username: '',
    password: '',
    role: 'user',
    firstname: '',
    lastname: ''
  };

  constructor(private userService: UserService) {
    this.refreshUsers();
  }

  get filteredUsers() {
    return this.users;
  }

  onFilterChange() {
    this.goToPage(1);
  }

  closeAddModal() {
    this.showAddModal = false;
    this.newUser = {
      username: '',
      password: '',
      role: 'user',
      firstname: '',
      lastname: ''
    };
  }

  addUser() {
    if (!this.newUser.username.trim() || !this.newUser.password.trim() || 
        !this.newUser.firstname.trim() || !this.newUser.lastname.trim()) return;
    
    this.userService.addUser(
      this.newUser.username.trim(),
      this.newUser.password,
      this.newUser.role,
      this.newUser.firstname.trim(),
      this.newUser.lastname.trim()
    ).subscribe(() => {
      this.refreshUsers();
      this.closeAddModal();
    });
  }

  editUser(index: number) {
    this.editingIndex = index;
    const user = this.users[index];
    this.editingUser = {
      username: user.username,
      password: '', // Don't show password in edit form
      role: user.role,
      firstname: user.firstname,
      lastname: user.lastname
    };
    this.showEditModal = true;
  }

  saveEdit() {
    if (!this.editingUser.username.trim() || !this.editingUser.firstname.trim() || !this.editingUser.lastname.trim()) return;
    
    const oldUsername = this.users[this.editingIndex!].username;
    this.userService.updateUser(
      oldUsername,
      this.editingUser.username.trim(),
      this.editingUser.password, // Empty string if not changed
      this.editingUser.role,
      this.editingUser.firstname.trim(),
      this.editingUser.lastname.trim()
    ).subscribe({
      next: () => {
        this.refreshUsers();
        this.closeEditModal();
      }
    });
  }

  closeEditModal() {
    this.showEditModal = false;
    this.editingIndex = null;
    this.editingUser = {
      username: '',
      password: '',
      role: 'user',
      firstname: '',
      lastname: ''
    };
  }

  cancelEdit() {
    this.closeEditModal();
  }

  deleteUser(index: number) {
    const username = this.users[index].username;
    this.userService.deleteUser(username).subscribe({
      next: () => {
        this.refreshUsers();
        if (this.editingIndex === index) this.closeEditModal();
      }
    });
  }

  refreshUsers() {
    this.loading = true;
    this.userService.getUsers(this.filterUsername, this.currentPage, this.pageSize).subscribe((res: any) => {
      this.users = res.results.map((u: any) => ({
        username: u.username || '',
        firstname: u.firstname || '',
        lastname: u.lastname || '',
        role: u.role || 'user',
        password: '********' // Don't show actual passwords
      }));
      this.currentPage = res.page;
      this.pageSize = res.per_page;
      this.total = res.total;
      this.pageCount = Math.ceil(this.total / this.pageSize) || 1;
      this.loading = false;
    }, () => { this.loading = false; });
  }

  goToPage(page: number) {
    if (page < 1 || page > this.pageCount) return;
    this.currentPage = page;
    this.refreshUsers();
  }

  onPageSizeChange(size: number) {
    this.pageSize = size;
    this.goToPage(1);
  }
} 