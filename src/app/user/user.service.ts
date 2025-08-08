import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly apiUrl = environment.stockApiBaseUrl + '/api/users';

  getUsers(filter?: string, page: number = 1, perPage: number = 10) {
    let url = this.apiUrl + `?page=${page}&per_page=${perPage}`;
    if (filter && filter.trim() !== '') {
      url += `&filter=${encodeURIComponent(filter.trim())}`;
    }
   
    console.log('Fetching users from URL:', url);
    
    return this.http.get<any>(url).pipe(
      map(response => {
        console.log('Raw user response:', response);
        return {
          total: response.total,
          page: response.page,
          per_page: response.per_page,
          results: response.results
        };
      })
    );
  }

  addUser(username: string, password: string, role: string, firstname: string, lastname: string) {
    return this.http.post(this.apiUrl, { username, password, role, firstname, lastname });
  }

  updateUser(oldUsername: string, username: string, password: string, role: string, firstname: string, lastname: string) {
    return this.http.put(`${this.apiUrl}/update`, { oldUsername, username, password, role, firstname, lastname });
  }

  deleteUser(username: string) {
    return this.http.post(`${this.apiUrl}/delete`, { username });
  }

  constructor(private http: HttpClient) {}
} 