import {Component, OnDestroy, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {Select, Store} from '@ngxs/store';
import {Login} from '../../shared/actions/auth.actions';
import {LoadingTrue} from '../../shared/state/app-general.state';
import {Observable} from 'rxjs';


  @Component({
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.css']
})
export class LoginPageComponent implements OnInit, OnDestroy {

  @Select('loading') loading$: Observable<boolean>;
  loading: boolean ;
  windowHeight;
  constructor( private router: Router, private store: Store) {

   }

  ngOnInit() {
    this.windowHeight =  window.screen.height + 'px';
    this.loading$.subscribe((data) => this.loading = data);
    // @ts-ignore
    window.fcWidget.show();
  }
  ngOnDestroy() {
    // @ts-ignore
    window.fcWidget.hide();
  }
  login() {this.store.dispatch([new LoadingTrue(), new Login()]); }

}
