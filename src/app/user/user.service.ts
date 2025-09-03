import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = environment.stockApiBaseUrl;

  constructor(private http: HttpClient) {}

  getUsers(filter: string = ''): Observable<any> {
    const params: any = filter ? { filter } : {};
    return this.http.get(`${this.apiUrl}/api/users`, { params });
  }

  addUser(user: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/users`, user);
  }

  updateUser(oldUsername: string, user: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/api/users/update`, {
      oldUsername,
      ...user
    });
  }

  deleteUser(username: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/users/delete`, { username });
  }
}
