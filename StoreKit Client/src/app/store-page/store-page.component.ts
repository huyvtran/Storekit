import {Component, OnDestroy, OnInit} from '@angular/core';
import {Actions, ofActionDispatched, Select, Store} from '@ngxs/store';
import {UserStoreState} from '../shared/models/store.model';
import {Observable, Subscription} from 'rxjs';
import {GetAllProducts, ProductFounded, SearchForProduct} from '../shared/actions/product.actions';
import {SingleProductModel} from '../shared/models/product.model';
import {Navigate} from '@ngxs/router-plugin';
import {LoadingFalse, LoadingTrue} from '../shared/state/app-general.state';
import {AuthState} from '../shared/state/auth.state';
import {first, take} from 'rxjs/operators';
import {StoreState} from '../shared/state/store.state';
import {Router} from '@angular/router';

@Component({
  selector: 'app-store-page',
  templateUrl: './store-page.component.html',
  styleUrls: ['./store-page.component.css']
})
export class StorePageComponent implements OnInit, OnDestroy {
  @Select(StoreState.uid) storeId$: Observable<string>;
  @Select('storeState') storeState$: Observable<object>;
  @Select('allProducts') allProducts$: Observable<SingleProductModel[]>;
  @Select('loading') loading$: Observable<boolean>;
  loading = true;
  storeDataSubscription: Subscription;
  storeState: UserStoreState;
  currentStore;
  allProducts: any[];
  resultProduct: any[];
  isWhitespace = true;
  isEmpty: boolean;
  role;
  isEmployee;
  isRegister;
  searchQuery: { storeId: string, query: string } = {storeId: '', query: ''};

  constructor(private store: Store, private actions$: Actions, private router: Router) {
    this.role = this.store.selectSnapshot(AuthState.role);
    this.isEmployee = this.store.selectSnapshot(AuthState.isEmployee);
    this.isRegister = this.store.selectSnapshot(AuthState.isRegister);
    this.loading$.subscribe((loading) => this.loading = loading.valueOf());
    this.storeId$.pipe(first()).subscribe((storeId) => this.searchQuery.storeId = storeId);
    this.storeDataSubscription = this.storeState$.pipe(take(1)).subscribe((data) => {
      this.storeState = new UserStoreState(data.valueOf());
      this.currentStore = this.storeState.linkedStores[this.storeState.selectedStore];
    });
    this.allProducts$.subscribe((data: any[]) => {
      this.allProducts = data;
      this.isEmpty = this.allProducts.length <= 0;
    });
  }

  ngOnInit() {
  }

  ngOnDestroy() {
  }

  navigateToProduct(productId: string) {
    const id = +this.router.routerState.snapshot.url.split('/')[3];
    this.store.dispatch([new Navigate([`go/u/${id}/store/product`], {uid: productId})]);
  }

  navigateToAddProduct() {
    const id = +this.router.routerState.snapshot.url.split('/')[3];
    this.store.dispatch([new Navigate([`go/u/${id}/add`])]);
  }

  onChange() {
    this.resultProduct = [];
  }
  search() {
    this.store.dispatch([new LoadingTrue(), new SearchForProduct(this.searchQuery)]);
    this.actions$.pipe(ofActionDispatched(ProductFounded), take(5)).subscribe(({resultProducts}) => {
      this.resultProduct = resultProducts;
      this.store.dispatch([new LoadingFalse()]);
    });
  }

}
