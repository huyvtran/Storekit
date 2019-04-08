import {Component, HostListener, OnDestroy, OnInit} from '@angular/core';
import {UserStoreState} from '../shared/models/store.model';
import {Actions, ofActionDispatched, Select, Store} from '@ngxs/store';
import {Observable, Subscription} from 'rxjs';
import {CartProduct, InvoiceModel} from '../shared/models/invoice.model';
import {AuthState} from '../shared/state/auth.state';
import {LoadingTrue} from '../shared/state/app-general.state';
import {first} from 'rxjs/operators';
import {SingleProductModel} from '../shared/models/product.model';
import {
  CheckCustomerExitsOrNot,
  CheckCustomerNewToStore,
  CustomerExits,
  CustomerNotExits,
  OldCustomerOfStore
} from '../shared/actions/customers.actions';
import {GetAllDiscounts, GotAllDiscountsSuccessfully} from '../shared/actions/discount.actions';
import {DiscountModel} from '../shared/models/discount.model';
import {SaveInvoice} from '../shared/actions/invoice.actions';
import {FormBuilder, Validators} from '@angular/forms';
import {BreakpointObserver} from '@angular/cdk/layout';

@Component({
  selector: 'app-billing-page',
  templateUrl: './sales-page.component.html',
  styleUrls: ['./sales-page.component.css'],

})
export class SalesPageComponent implements OnInit, OnDestroy {
  @Select('storeState') storeState$: Observable<object>;
  @Select('allProducts') allProducts$: Observable<object[]>;
  @Select(AuthState.uid) uid$: Observable<string>;
  storeDataSubscription: Subscription;
  storeState: UserStoreState;
  currentStore;
  allProducts: any[];
  typeOfPaymentValues = ['Cash', 'Card', 'Cash & Card'];
  cartProducts: CartProduct[] = [];
  invoice = new InvoiceModel();
  outStockedProducts = [];
  rewardDetail = {};
  allDiscounts: DiscountModel[];
  selectedDiscountIndex: number;
  isOldCustomer = false;
  customerNotExit = false;
  isErrorInSavingInvoice = false;
  isFc = true;
  screenWidth;
  printContents;
  uiModelGroup = this.fb.group({
    prn: '',
    phoneNumber: ['', Validators.required],
    customerName: [],
    typeOfPayment: ['Cash'],
  });
  isSmallScreen = this.breakpointObserver.isMatched('(max-width: 650px)');

  constructor(private store: Store, private action$: Actions, private fb: FormBuilder, private breakpointObserver: BreakpointObserver) {
    this.invoice.typeOfPayment = 'Cash';
    this.screenWidth = window.screen.width;
  }

  get prn() {
    return this.uiModelGroup.get('prn');
  }

  get phoneNumber() {
    return this.uiModelGroup.get('phoneNumber');
  }

  get customerName() {
    return this.uiModelGroup.get('customerName');
  }

  get typeOfPayment() {
    return this.uiModelGroup.get('typeOfPayment');
  }

  @HostListener('window:keyup', ['$event'])
  keyEvent(event: KeyboardEvent) {
    const litKeys = event.altKey && event.ctrlKey;
    if (litKeys && (event.key === 'S' || event.key === 's')) {
      this.saveInvoice();
    }

  }

  ngOnInit() {
    this.uid$.subscribe((uid) => this.invoice.billedBy = uid);
    this.subscribeToProducts();
    this.action$
      .pipe(ofActionDispatched(GotAllDiscountsSuccessfully)).subscribe(({allDiscount}) => this.allDiscounts = allDiscount);
    this.invoice.storeUid = this.currentStore.storeUid;
    this.invoice.hasNoGstNumber = this.currentStore.hasNoGstNumber;
    this.invoice.gstNumber = this.currentStore.gstNumber;
    this.phoneNumber.valueChanges.subscribe((number) => {
      this.invoice.customerNumber = number;
      this.phoneNoChanged(number);
    });
    this.customerName.valueChanges.subscribe((customerName) => {
      this.invoice.customerName = customerName;
    });
  }

  ngOnDestroy() {
    this.storeDataSubscription.unsubscribe();

  }

  subscribeToProducts() {

    this.storeDataSubscription = this.storeState$.subscribe((data) => {
      this.storeState = new UserStoreState(data.valueOf());
      this.currentStore = this.storeState.linkedStores[this.storeState.selectedStore];
    });
    this.store.dispatch([new GetAllDiscounts(this.currentStore.storeUid)]);
    this.allProducts$.subscribe((data: SingleProductModel[]) => {
      this.allProducts = data;
      console.log(this.allProducts);
    });
  }

  addDiscount(index) {
    if (!this.invoice.isDiscountApplied && this.cartProducts.length > 0) {
      this.selectedDiscountIndex = index;
      this.invoice.discount = this.allDiscounts[index];
      this.invoice.isDiscountApplied = true;
      if (this.allDiscounts[index].amountType === 'percentage') {
        this.invoice.discountPrice =
          this.invoice.totalPrice - (this.invoice.totalPrice * (parseFloat(this.allDiscounts[index].amount) / 100));
      } else {
        this.invoice.discountPrice = this.invoice.totalPrice - parseFloat(this.allDiscounts[index].amount);
      }
    } else {
      this.removeDiscount();
    }
  }

  removeDiscount() {
    this.invoice.discount = {};
    this.invoice.isDiscountApplied = false;
    this.invoice.discountPrice = 0;
    this.selectedDiscountIndex = null;
  }

  phoneNoChanged(phoneNo) {
    if (String(phoneNo).length === 10) {
      this.store.dispatch([new LoadingTrue(), new CheckCustomerExitsOrNot(phoneNo)]);
      this.action$.pipe(ofActionDispatched(CustomerExits), first()).subscribe(({customerName}) => {
        if (customerName === '') {
          this.customerNotExit = true;
        }
        this.invoice.customerName = customerName;
        this.store.dispatch([new LoadingTrue(), new CheckCustomerNewToStore(phoneNo, this.currentStore.storeUid)]);
      });
      this.action$.pipe(ofActionDispatched(CustomerNotExits), first()).subscribe(() => this.customerNotExit = true);
      this.action$.pipe(ofActionDispatched(OldCustomerOfStore), first()).subscribe(({rewardDetail}) => {
        this.isOldCustomer = true;
        this.rewardDetail = rewardDetail;
      });
    } else {
      this.invoice.customerName = '';
      this.customerNotExit = false;
      this.isOldCustomer = false;
      this.rewardDetail = {};
    }
  }

  getProduct(product: string) {
    this.prn.patchValue(product.split('/')[1]);
  }

  checkWhetherOutOfStock(stock) {
    return stock === 0;
  }

  addToCart(prn: string) {
    const resultProduct: SingleProductModel[] = this.findProduct(prn);
    console.log(resultProduct);
    if (resultProduct.length > 0) {
      const cartProduct = new CartProduct();


      if (!this.checkWhetherOutOfStock(resultProduct[0].stock)) {
        // default selection of size
        cartProduct.addedBy = this.invoice.billedBy;
        cartProduct.fromProductData(resultProduct[0]);
        this.calculateTotal(cartProduct);
        this.cartProducts.push(cartProduct);
        this.calculateInvoiceTotal();


      } else {
        return console.log('Product does not exits');
      }

      this.subscribeToProducts();
    } else {
      console.log('prn not found');
    }
  }

  calculateTotal(product) {
    product.calculateProductTotal();
    this.calculateInvoiceTotal();

  }

  async calculateInvoiceTotal() {
    await this.invoice.cartProductsToJson(this.cartProducts);
    this.outStockedProducts = this.cartProducts.filter(value => value.isOutStock === true);
  }

// this function for check whether product exits, disabled for add same product of multiple size
//   checkProduct(prn) {
//     return this.cartProducts.filter(product => product.prn === prn).length === 0;
//   }

  findProduct(prn) {
    console.log(this.allProducts.filter(product => product['prn'] === prn), prn, this.prn);
    return this.allProducts.filter(product => product['prn'] === prn);
  }

  selectPayment(index) {
    this.invoice.typeOfPayment = index;

  }

  deleteProductFromCart(i) {

    if (i !== -1) {
      this.cartProducts.splice(i, 1);
      this.calculateInvoiceTotal();
    }
  }

  reset() {
    this.cartProducts = [];
    this.invoice = new InvoiceModel();
    this.outStockedProducts = [];
    this.isErrorInSavingInvoice = false;
    this.invoice.typeOfPayment = 'Cash';
  }

  saveInvoice(type?: string) {

    if (
      this.invoice.customerNumber.toString().indexOf('') === 0
      && this.invoice.customerNumber.toString().length === 10
      && this.cartProducts.length > 0
      && this.outStockedProducts.length === 0
    ) {
      this.calculateInvoiceTotal();
      this.invoice.storeDetails = {
        storeName: this.currentStore.storeName,
        address: this.currentStore.address ? this.currentStore.address : '',
        mobileNumber: this.currentStore.mobileNumber ? this.currentStore.mobileNumber : '',
        location: this.currentStore.location ? this.currentStore.location : '',
        gstNumber: this.currentStore.gstNumber ? this.currentStore.gstNumber : '',
        storeLogo: this.currentStore.storeLogo ? this.currentStore.storeLogo.localDownloadUrl : ''
      };

      if (type === 'print') {
        this.print();
        this.invoice.sendSms = false;
      } else {
        this.invoice.sendSms = true;
      }
      return this.store.dispatch([new LoadingTrue(), new SaveInvoice(this.invoice)]);
    } else {
      this.isErrorInSavingInvoice = true;
    }
  }

  print(): void {
    this.printContents = '';
    let popupWin;

    this.printContents = document.getElementById('print-section').innerHTML + this.printContents;

    popupWin = window.open('', '_blank', 'top=0,left=0,height=100%,width=auto');
    popupWin.document.open();
    popupWin.document.write(`
      <html>
        <head>
          <title>Print tab</title>
          <style>
           @page {
            size: auto;  /* auto is the initial value */
            margin: 0mm; /* this affects the margin in the printer settings */
          }
          html {
            background-color: #FFFFFF;
            margin: 0px; /* this affects the margin on the HTML before sending to printer */
            padding: 0px;
          }
          .container{
          max-width: 300px;
          text-align: center;
          }
          p{
          text-align: right;
          }
          table {
                font-family: arial, sans-serif;
                border-collapse: collapse;
                width: 100%;
            }
            td, th {
                border: 1px solid #dddddd;
                text-align: left;
                padding: 8px;
            }
            tr:nth-child(even) {
                background-color: #dddddd;
            }
          </style>
        </head>
    <body onload="window.print();window.close()">
    <div class="container" >

     ${this.printContents}
    </div>
    </body>
      </html>`
    );
    popupWin.document.close();
  }

}
