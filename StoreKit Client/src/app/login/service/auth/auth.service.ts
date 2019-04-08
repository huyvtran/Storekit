import {Injectable} from '@angular/core';
import * as firebase from 'firebase/app';
import {AngularFireAuth} from '@angular/fire/auth';
import {AngularFirestore} from '@angular/fire/firestore';
import {LoginModel, User, UserModel} from '../../../shared/models/auth.model';
import {switchMap} from 'rxjs/operators';
import {Observable, of} from 'rxjs';
import {environment} from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})

export class AuthService {

  user$: Observable<UserModel>;

  constructor(private afAuth: AngularFireAuth, private db: AngularFirestore) {

  }

  async checkAuth() {
    this.user$ = await this.afAuth.authState.pipe(
      switchMap(user => {
        if (user) {
          // @ts-ignore
          return this.db.doc(`users/${user.email}`).valueChanges();
        } else {
          return of(null);
        }
      })
    );
    return this.user$;
  }

  ///// SignIn - SignOut Process /////

  googleLogin() {
    return this.afAuth.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).then(() => {
      const provider = new firebase.auth.GoogleAuthProvider();
      const user = this.afAuth.auth.signInWithPopup(provider)
        .then(credential => {
          this.setUser(credential);
          return new User(credential);
        });
      return user;
    });
  }

  signOut() {
    return this.afAuth.auth.signOut();
  }

  //// Set user data ////

  /// set database with user info after login
  /// only runs if user role is not already defined in database
  private setUser(authData) {
    const userData = new LoginModel(authData);
    const ref = this.db.collection('users').doc(`${authData.user.email}`).ref;
    ref.onSnapshot((user) => {
      if (!environment.production) {
        console.log(userData);
      }
      return ref.set(userData.toJson(), {merge: true});

    });
  }


}
