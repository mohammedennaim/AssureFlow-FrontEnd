import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { IUserRepository, CreateUserData } from '../../domain/ports/user.repository.port';
import { User } from '../../domain/models/user.model';
import { ApiResponse } from '../../domain/models/api-response.model';

@Injectable({ providedIn: 'root' })
export class HttpUserRepository implements IUserRepository {
  private readonly apiUrl = 'http://localhost:8080/api/v1/users';

  constructor(private http: HttpClient) { }

  getAll(): Observable<User[]> {
    return this.http.get<ApiResponse<User[]>>(this.apiUrl).pipe(
      map((res) => res.data)
    );
  }

  create(data: CreateUserData): Observable<User> {
    return this.http.post<ApiResponse<User>>(this.apiUrl, data).pipe(
      map((res) => res.data)
    );
  }

  update(id: string, data: Partial<User>): Observable<User> {
    return this.http.put<ApiResponse<User>>(`${this.apiUrl}/${id}`, data).pipe(
      map((res) => res.data)
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
