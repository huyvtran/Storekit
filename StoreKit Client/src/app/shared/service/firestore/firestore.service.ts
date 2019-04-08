import {Injectable} from '@angular/core';
import {AngularFirestore} from '@angular/fire/firestore';
import {ShopRegistrationForm} from '../../models/store.model';
import {Store} from '@ngxs/store';
import {
  ErrorInGettingEmployeeLinkedStore,
  ErrorInStoreLogoUpload,
  ErrorInStorePicturesUpload,
  ErrorInUpdateStoreDescription,
  ErrorInUpdateUniqueStoreName,
  GotAllEmployeesSuccessfully,
  GotConfig,
  GotEmployeeLinkedStoresSuccessfully,
  StoreLogoUploadedSuccessfully,
  StorePicturesUploadedSuccessfully,
  UpdatedStoreDescriptionSuccessfully,
  UpdateUniqueStoreNameSuccessful
} from '../../actions/store.actions';
import {SingleProductModel} from '../../models/product.model';
import {
  GetAllProductsError,
  GotAllProducts,
  GotProductByUid,
  SingleProductNotUploaded,
  SingleProductUploadedSuccessfully
} from '../../actions/product.actions';
import {ExtraUser} from '../../models/auth.model';
import {InvoiceModel} from '../../models/invoice.model';
import {GotAllInvoiceSuccessfully} from '../../actions/invoice.actions';
import {OnlineProductTagModel} from '../../models/online-product-tag.model';
import {
  ErrorInAddingOnlineProductTag,
  ErrorInGettingOnlineProductTags,
  ErrorInRemovingOnlineProductTag,
  GotOnlineProductTagsSuccessfully,
  OnlineProductTagSuccessfullyAdded,
  RemovedOnlineProductTagSuccessfully
} from '../../actions/online-product-tag.actions';
import {LoadingFalse} from '../../state/app-general.state';
import {
  ErrorInGettingInvoice,
  ErrorInReturningInvoice,
  GotAllReturnsSuccessfully,
  GotInvoiceSuccessfully,
  InvoiceNotFound,
  ReturnedInvoiceSuccessfully, ReturnStock
} from '../../actions/return.actions';
import {ReturnModel} from '../../models/return.model';
import {DiscountModel} from '../../models/discount.model';
import {
  DiscountDeletedSuccessfully,
  DiscountNotUploaded,
  DiscountUploadedSuccessfully,
  ErrorInDeletingDiscount,
  GotAllDiscountsSuccessfully
} from '../../actions/discount.actions';
import {CustomerExits, CustomerNotExits, NewCustomerOfStore, OldCustomerOfStore} from '../../actions/customers.actions';

import * as firebase from 'firebase';
import FieldValue = firebase.firestore.FieldValue;
import DocumentReference = firebase.firestore.DocumentReference;

// @ts-ignore
@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  stores: any[];
  employees: any[];
  allProducts: any[];
  resultProducts: any[];
  allInvoice: InvoiceModel[];
  allReturns: ReturnModel[];

  constructor(private db: AngularFirestore, private  store: Store) {
    firebase.firestore().enablePersistence()
      .catch(function (err) {
        if (err.code === 'failed-precondition') {
          // Multiple tabs open, persistence can only be enabled
          // in one tab at a a time.
          // ...
        } else if (err.code === 'unimplemented') {
          // The current browser does not support all of the
          // features required to enable persistence
          // ...
        }
      });

  }

// utility function

  generatePRN(docRef: DocumentReference, storeId: string, groupId: string) {
    let prn = '';
    const possible = 'bcdfghjklmnpqrstvwxyz';

    for (let i = 0; i < 4; i++) {
      prn += possible.charAt(Math.floor(Math.random() * possible.length));
    }

    return this.checkAndUpdate(docRef, prn, storeId, groupId);
  }

  checkAndUpdate(docRef: DocumentReference, prn: string, storeId: string, groupId: string) {
    return this.db.collection('products').ref
      .where(storeId, '==', storeId)
      .where(prn, '==', prn)
      .get()
      .then((data) => {
        if (data.size === 0) {
          return this.db.firestore.runTransaction((t) =>
            t.get(docRef)
              .then(() => {
                t.update(docRef, {productUid: docRef.id, prn: prn, groupId: groupId === '' ? prn : groupId});
                return prn;
              }));
        } else {
          return this.generatePRN(docRef, storeId, groupId);
        }
      });
  }

  getLinkedStore(uid) {
    return this.db.collection('stores', ref => ref.where('registerUid', '==', uid)).valueChanges();
  }

  setupNewStore(store: ShopRegistrationForm) {
    return this.db.collection('stores')
      .add(store.toJson())
      .then((docRef) => docRef.update({storeUid: docRef.id}));
  }


  async uploadSingleProduct(products: SingleProductModel[]) {
    let groupId = '';
    for (let i = 0; i < products.length; i++) {
      await this.db.collection(`products`)
        .add(products[i].toJson())
        .then((docRef) =>
          this.generatePRN(docRef, products[i].storeId, groupId)
        ).then((prn) => {
          if (groupId === '') {
            groupId = prn;
          }
        }).then(() => {
          this.store.dispatch([new SingleProductUploadedSuccessfully()]);
        }).catch((err) => this.store.dispatch([new SingleProductNotUploaded(err)]));
    }


  }

  getAllProducts(storeId: string) {
    return this.db.collection(`products`, ref =>
      ref
        .where('storeId', '==', `${storeId}`)
        .where('isDeleted', '==', false)
        .orderBy('createdOn', 'desc'))
      .valueChanges()
      .subscribe((data) => this.store.dispatch([new GotAllProducts(data)]),
        error1 => this.store.dispatch([new GetAllProductsError(error1)])
      );
  }

  deleteProduct(productUid) {
    return this.db.collection(`products`).ref
      .doc(`${productUid}`).update('isDeleted', true);
  }

  addingExtraUser(extraUser: ExtraUser) {
    return this.db.collection('users').doc(`${extraUser.email}`).set(extraUser.toJson(), {merge: true});
  }

  deleteExtraUser(email: string) {
    return this.db.collection('users').doc(`${email}`).delete();
  }

  getExtraUser(storeUid: string) {
    this.employees = [];
    this.db.collection('users').ref.where('employeeOf', 'array-contains', storeUid).get().then((users) => {
      users.forEach((user) => {
        this.employees.push(user.data());
      });

    }).then(() => this.store.dispatch([new GotAllEmployeesSuccessfully(this.employees)]));
  }

  GetEmployeeLinkedStore(stores: string[]) {
    this.stores = [];
    stores.forEach((storeUid) => {
      this.db.collection('stores').doc(`${storeUid}`).ref.get().then((store) => {
        if (store.exists) {
          this.stores.push(store.data());
          console.log(this.stores);
        }
      }).then(() => this.store.dispatch([new GotEmployeeLinkedStoresSuccessfully(this.stores)])
      ).catch((err) => {
        this.store.dispatch([new ErrorInGettingEmployeeLinkedStore(err)]);
        console.log(err);
      });
    });


  }

  saveInvoice(invoice: InvoiceModel) {
    console.log(invoice.toJson());
    return this.db
      .collection(`invoices`)
      .add(invoice.toJson())
      .then((docRef) => docRef.update({invoiceId: docRef.id}));
  }

  async getAllInvoice(storeUid: string) {
    return this.db.collection(`invoices`).ref
      .where('storeUid', '==', storeUid)
      .orderBy('createdOn', 'desc')
      .get()
      .then((invoices) => {
        this.allInvoice = [];
        invoices.forEach((data) => {
          const invoice = new InvoiceModel();
          invoice.fromJson(data.data());
          this.allInvoice.push(invoice);
        });
        this.store.dispatch([new GotAllInvoiceSuccessfully(this.allInvoice)]);
      });
  }
  reduceStock(invoice: InvoiceModel) {
    return invoice.cartProducts.forEach((product) => {
      const productRef = this.db.doc(`products/${product['productUid']}`).ref;
      return this.db.firestore.runTransaction(transaction => {
        return transaction.get(productRef).then((doc) => {
          if (doc.exists) {
            const newStock = doc.data()['stock'] > 0 ? doc.data()['stock'] - product['totalQuantity'] : 0;
            const sold = doc.data()['sold'] ? doc.data()['sold'] + product['totalQuantity'] : 1 ;
            return transaction.set(productRef, {stock: newStock, sold: sold}, {merge: true});
          }
        });
      });
    });
  }
  getInvoice(invoiceId: string) {

    return this.db.collection(`invoices`).doc(`${invoiceId}`).ref.get().then((doc) => {
      const invoice = new InvoiceModel();
      console.log(doc.data());
      if (doc.exists) {
        invoice.fromJson(doc.data());
        return this.store.dispatch([new GotInvoiceSuccessfully(invoice), new LoadingFalse()]);
      } else {
        return this.store.dispatch([new InvoiceNotFound(), new LoadingFalse()]);
      }
    }).catch((err) => this.store.dispatch([new LoadingFalse(), new ErrorInGettingInvoice(err)]) );
  }

  getAllReturns(storeUid: string) {
    return this.db.collection(`stores/${storeUid}/returns`).ref
      .get()
      .then((invoices) => {
        this.allReturns = [];
        invoices.forEach((data) => {
          this.allReturns.push(new ReturnModel(data.data()));
        });
        this.store.dispatch([new GotAllReturnsSuccessfully(this.allReturns)]);
      });
  }

  returnInvoice(returnInvoice: ReturnModel) {
    this.db.collection(`stores/${returnInvoice.storeUid}/returns`).doc(returnInvoice.invoiceId).ref
      .get()
      .then((data) =>
        !data.exists
          ? this.newReturnInvoice(returnInvoice)
          : this.updateReturnInvoice(returnInvoice, data.id))
      .catch((err) => this.store.dispatch([new ErrorInReturningInvoice(err), new LoadingFalse()]));

  }
  async returnStock(returnInvoice: ReturnModel) {
    if (returnInvoice.isAllReturn) {
      await this.addStock(returnInvoice);
      this.db.collection(`invoices`).doc(`${returnInvoice.invoiceId}`).delete();
    } else {
      await this.addStock(returnInvoice);
     const invoiceRef =  this.db.collection(`invoices`).doc(`${returnInvoice.invoiceId}`).ref;
      return this.db.firestore.runTransaction(transaction => {
         return transaction.get(invoiceRef).then((doc) => {
           if (doc.exists) {
             const invoiceCartProduct: object[] = doc.data()['cartProducts'];
             returnInvoice.cartProducts.forEach((product) => {
               invoiceCartProduct.splice(returnInvoice.cartProducts.indexOf(product), 1);
             });
             return transaction.set(invoiceRef, {cartProducts: invoiceCartProduct}, {merge: true});
           }
         });
       });
    }
  }
  addStock(returnInvoice: ReturnModel) {
   return returnInvoice.cartProducts.forEach((product) => {
      const productRef = this.db.doc(`products/${product['productUid']}`).ref;
      return this.db.firestore.runTransaction(transaction => {
        return transaction.get(productRef).then((doc) => {
          if (doc.exists) {
            const newStock = doc.data()['stock'] > 0 ? doc.data()['stock'] + product['totalQuantity'] : product['totalQuantity'];
            const sold = doc.data()['sold'] ? doc.data()['sold'] - product['totalQuantity'] : 0 ;
            const newReturn = doc.data()['return'] ? doc.data()['sold'] + product['totalQuantity'] : 1 ;
            return transaction.set(productRef, {stock: newStock, sold: sold, return: newReturn}, {merge: true});
          }
        });
      });
    });
  }
  newReturnInvoice(returnInvoice: ReturnModel) {
    this.db.collection(`stores/${returnInvoice.storeUid}/returns`)
      .add(returnInvoice.toJson())
      .then(() => this.store.dispatch([new ReturnStock(returnInvoice), new ReturnedInvoiceSuccessfully(), new LoadingFalse()]))
      .catch((err) => this.store.dispatch([new ErrorInReturningInvoice(err), new LoadingFalse()]));
  }

  updateReturnInvoice(returnInvoice: ReturnModel, docId) {
    console.log(docId);
    this.db.collection(`stores/${returnInvoice.storeUid}/returns`).doc(docId)
      .set(returnInvoice.toJson(), {merge: true, mergeFields: ['cartProducts']})
      .then(() => this.store.dispatch([new ReturnStock(returnInvoice), new ReturnedInvoiceSuccessfully(), new LoadingFalse()]))
      .catch((err) => this.store.dispatch([new ErrorInReturningInvoice(err), new LoadingFalse()]));
  }

  getProductById(productUid: string) {
    return this.db.collection('products')
      .doc(`${productUid}`).ref
      .get()
      .then((doc) => this.store.dispatch([new GotProductByUid(doc.data())]));
  }

  addOnlineProductTag(opt: OnlineProductTagModel) {
    return this.db.collection('onlineProductTags')
      .add(opt.toJson())
      .then(() => this.store.dispatch([new OnlineProductTagSuccessfullyAdded(), new LoadingFalse()]))
      .catch(err => this.store.dispatch([new ErrorInAddingOnlineProductTag(err), new LoadingFalse()]));
  }

  getOnlineProductTags(productUid: string) {
    const opts: object[] = [];
    return this.db.collection('onlineProductTags')
      .ref
      .where('productUid', '==', productUid)
      .get()
      .then((docs) => docs
        .forEach(doc => opts
          .push(doc.data())))
      .then(() => this.store.dispatch([new GotOnlineProductTagsSuccessfully(opts), new LoadingFalse()]))
      .catch(err => this.store.dispatch([new ErrorInGettingOnlineProductTags(err), new LoadingFalse()]));
  }

  removeOnlineProductTag(onlineProductLink: string) {
    return this.db.collection('onlineProductTags')
      .ref
      .where('onlineProductLink', '==', onlineProductLink)
      .limit(1)
      .get()
      .then((docs) => docs
        .forEach(doc => doc.ref.delete()))
      .then(() => this.store.dispatch([new RemovedOnlineProductTagSuccessfully(), new LoadingFalse()]))
      .catch(err => this.store.dispatch([new ErrorInRemovingOnlineProductTag(err), new LoadingFalse()]));
  }

  uploadStoreLogo(storeUid: string, data: { localDownloadUrl: string, localPictureRef: string }) {
    this.db.collection('stores')
      .doc(`${storeUid}`)
      .set({'storeLogo': data}, {merge: true})
      .then(() => this.store.dispatch([new StoreLogoUploadedSuccessfully()]))
      .catch((err) => this.store.dispatch([new ErrorInStoreLogoUpload(err)]));
  }

  uploadStorePictures(storeUid: string, data: { localDownloadUrls: string[], localPictureRefs: string[] }) {
    this.db.collection('stores')
      .doc(`${storeUid}`)
      .set({'storePictures': data}, {merge: true})
      .then(() => this.store.dispatch([new StorePicturesUploadedSuccessfully()]))
      .catch((err) => this.store.dispatch([new ErrorInStorePicturesUpload(err)]));
  }


  updateStoreDescription(storeUid: string, description: string) {
    this.db.collection('stores')
      .doc(`${storeUid}`)
      .set({'description': description}, {merge: true})
      .then(() => this.store.dispatch([new UpdatedStoreDescriptionSuccessfully()]))
      .catch((err) => this.store.dispatch([new ErrorInUpdateStoreDescription(err)]));
  }

  updateUniqueStoreName(storeUid: string, usn: string) {
    const stores = this.db.collection('stores').ref;
    stores.where('usn', '==', `${usn}`)
      .get()
      .then((data) => {
        if (data.empty) {
          stores.doc(`${storeUid}`).set({'usn': usn}, {merge: true})
            .then(() => this.store.dispatch([new UpdateUniqueStoreNameSuccessful(true), new LoadingFalse()]))
            .catch((err) => this.store.dispatch([new ErrorInUpdateUniqueStoreName(err), new LoadingFalse()]));
        } else {
          this.store.dispatch([new UpdateUniqueStoreNameSuccessful(false), new LoadingFalse()]);
        }
      }).catch((err) => this.store.dispatch([new ErrorInUpdateUniqueStoreName(err), new LoadingFalse()]));
  }

  uploadDiscount(discount: DiscountModel) {
    console.log(discount.toJson());
    return this.db.collection(`discounts`)
      .add(discount.toJson())
      .then((docRef) => docRef.update({discountUid: docRef.id}))
      .then(() => this.store.dispatch([new DiscountUploadedSuccessfully()]))
      .catch((err) => this.store.dispatch([new DiscountNotUploaded(err)]));
  }

  deleteDiscount(discountUid: string) {
    return this.db.collection(`discounts`)
      .doc(`${discountUid}`)
      .delete()
      .then(() => this.store.dispatch([new DiscountDeletedSuccessfully()]))
      .catch((err) => this.store.dispatch([new ErrorInDeletingDiscount(err)]));
  }

  getAllDiscount(storeUid: string) {
    const discounts: any[] = [];
    return this.db.collection(`discounts`).ref
      .where('storeUid', '==', storeUid)
      .get()
      .then(async (docs) => {
        await docs.forEach((doc) => discounts.push(doc.data()));
        this.store.dispatch([new GotAllDiscountsSuccessfully(discounts)]);
      });
  }

  checkCustomerExitsOrNot(customerNumber) {
    return this.db.doc(`customers/${customerNumber}`).ref
      .get()
      .then((customer) => {
        if (customer.exists) {
          this.store.dispatch([new CustomerExits(customer.data()['customerName']), new LoadingFalse()]);
        } else {
          this.store.dispatch([new CustomerNotExits(), new LoadingFalse()]);
        }
      });
  }

  checkCustomerNewToStore(storeId, customerNumber) {
    return this.db
      .doc(`stores/${storeId}/customers/${customerNumber}`).ref
      .get()
      .then((rewardDetails) => {
        if (rewardDetails.exists) {
          this.store.dispatch([new OldCustomerOfStore(rewardDetails.data())]);
        } else {
          this.store.dispatch([new NewCustomerOfStore()]);
        }
      });
  }

  getAllCustomers(storeId) {
    return this.db
      .collection(`stores/${storeId}/customers`).ref.get();
  }

  incrementStock(productId: string, index: number) {
// Create a reference to the product doc.
    const productDocRef = this.db.firestore.collection('products').doc(productId);


    return this.db.firestore.runTransaction(transaction =>
// This code may get re-run multiple times if there are conflicts.
      transaction.get(productDocRef)
        .then(productDoc => {
          const updatedVariants = productDoc.data().variants;
          updatedVariants[index].stock++;
          transaction.update(productDocRef, {variants: updatedVariants});
        })).then(() => console.log('Transaction successfully committed!'))
      .catch(error => console.log('Transaction failed: ', error));
  }

  decrementStock(productId: string, index: number) {
// Create a reference to the product doc.
    const productDocRef = this.db.firestore.collection('products').doc(productId);


    return this.db.firestore.runTransaction(transaction =>
// This code may get re-run multiple times if there are conflicts.
      transaction.get(productDocRef)
        .then(productDoc => {
          const updatedVariants = productDoc.data().variants;
          updatedVariants[index].stock--;
          transaction.update(productDocRef, {variants: updatedVariants});
        })).then(() => console.log('Transaction successfully committed!'))
      .catch(error => console.log('Transaction failed: ', error));
  }

  addProductTag(productId: string, tag: string) {

    return this.db.firestore
      .collection('products')
      .doc(productId)
      .update({'tags': FieldValue.arrayUnion(tag)});


  }

  removeProductTag(productId: string, tag: string) {
    return this.db.firestore
      .collection('products')
      .doc(productId)
      .update({'tags': FieldValue.arrayRemove(tag)});


  }

  addProductVariant(productId: string, variant: object) {
    return this.db.firestore
      .collection('products')
      .doc(productId)
      .update({'variants': FieldValue.arrayUnion(variant)});
  }

  // selected store selected store

  getAllConfig(storeId) {
    const listOfConfigs = ['brands', 'attributes', 'categories', 'suppliers', 'units', 'taxes'];
    listOfConfigs.forEach((config) => {
      return this.db.collection(`stores/${storeId}/${config}`).valueChanges().subscribe((data) => {
        this.store.dispatch([new GotConfig(config, data)]);
      });
    });
  }
}
