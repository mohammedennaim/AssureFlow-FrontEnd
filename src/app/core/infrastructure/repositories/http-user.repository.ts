import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { IUserRepository, CreateUserData } from '../../domain/ports/user.repository.port';
import { User } from '../../domain/models/user.model';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class HttpUserRepository implements IUserRepository {
  private readonly apiUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) { }

  getAll(): Observable<User[]> {
    return this.http.get<any>(this.apiUrl).pipe(
      map((res) => {
        console.log('[UserRepository] getAll raw response:', res);
        
        let data: UserDto[] = [];
        
        if (Array.isArray(res)) {
          data = res;
        } else if (res?.data && Array.isArray(res.data)) {
          data = res.data;
        } else if (res?.content && Array.isArray(res.content)) {
          data = res.content;
        } else if (res?.users && Array.isArray(res.users)) {
          data = res.users;
        } else if (res?.items && Array.isArray(res.items)) {
          data = res.items;
        }
        
        console.log('[UserRepository] extracted data:', data);
        return data.map(this.mapToUser);
      }),
      catchError((err) => {
        console.error('[UserRepository] getAll error:', err);
        return of([]);
      })
    );
  }

  getById(id: string): Observable<User> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map((res) => {
        let dto: UserDto | null = null;
        
        if (res?.data) {
          dto = res.data;
        } else if (res?.user) {
          dto = res.user;
        } else {
          dto = res;
        }
        
        return this.mapToUser(dto as UserDto);
      })
    );
  }

  create(data: CreateUserData): Observable<User> {
    return this.http.post<any>(this.apiUrl, data).pipe(
      map((res) => {
        let dto: UserDto | null = null;
        
        if (res?.data) {
          dto = res.data;
        } else if (res?.user) {
          dto = res.user;
        } else {
          dto = res;
        }
        
        return this.mapToUser(dto as UserDto);
      })
    );
  }

  update(id: string, data: Partial<User>): Observable<User> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, data).pipe(
      map((res) => {
        let dto: UserDto | null = null;
        
        if (res?.data) {
          dto = res.data;
        } else if (res?.user) {
          dto = res.user;
        } else {
          dto = res;
        }
        
        return this.mapToUser(dto as UserDto);
      })
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  assignRole(userId: string, roleId: string): Observable<User> {
    return this.http.post<any>(`${this.apiUrl}/${userId}/roles`, { roleId }).pipe(
      map((res) => {
        let dto: UserDto | null = null;
        
        if (res?.data) {
          dto = res.data;
        } else if (res?.user) {
          dto = res.user;
        } else {
          dto = res;
        }
        
        return this.mapToUser(dto as UserDto);
      }),
      catchError((err) => {
        console.error('[UserRepository] assignRole error:', err);
        throw err;
      })
    );
  }

  removeRole(userId: string, roleId: string): Observable<User> {
    return this.http.delete<any>(`${this.apiUrl}/${userId}/roles/${roleId}`).pipe(
      map((res) => {
        let dto: UserDto | null = null;
        
        if (res?.data) {
          dto = res.data;
        } else if (res?.user) {
          dto = res.user;
        } else {
          dto = res;
        }
        
        return this.mapToUser(dto as UserDto);
      })
    );
  }

  getUserSessions(userId: string): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/${userId}/sessions`).pipe(
      map((res) => {
        if (Array.isArray(res)) {
          return res;
        } else if (res?.data && Array.isArray(res.data)) {
          return res.data;
        }
        return [];
      }),
      catchError((err) => {
        console.error('[UserRepository] getUserSessions error:', err);
        return of([]);
      })
    );
  }

  invalidateUserSessions(userId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${userId}/sessions`);
  }

  getUserAuditLogs(userId: string): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/${userId}/audit-logs`).pipe(
      map((res) => {
        if (Array.isArray(res)) {
          return res;
        } else if (res?.data && Array.isArray(res.data)) {
          return res.data;
        }
        return [];
      }),
      catchError((err) => {
        console.error('[UserRepository] getUserAuditLogs error:', err);
        return of([]);
      })
    );
  }

  private mapToUser(dto: UserDto): User {
    return {
      id: dto.id,
      username: dto.username,
      email: dto.email,
      active: dto.active,
      role: dto.roles?.[0]?.name ?? 'USER',
      roles: dto.roles || [],
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
    };
  }
}

interface UserDto {
  id: string;
  username: string;
  email: string;
  active: boolean;
  roles: { id: string; name: string }[];
  createdAt: string;
  updatedAt: string;
}

