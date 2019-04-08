import {firestore} from 'firebase/app';


export class UserStoreState {
  linkedStores: any[];
  selectedStore: number; // index of selected store in stores array
  currentStoreConfig: {
    brands: {}[],
    attributes: {}[],
    categories: {}[],
    suppliers: {}[],
    units: {}[],
    taxes: {}[]
  }
  constructor(data) {
    this.linkedStores = data.linkedStores;
    this.selectedStore = data.selectedStore;
    this.currentStoreConfig = data.currentStoreConfig;

  }
}


export class ShopRegistrationForm {
  registerUid: string;
  storeName: string;
  gstNumber: string;
  hasNoGstNumber: boolean;
  mobileNumber: string;
  // contactNumber: string;
  typeOfStore: 'boutique' |
    'factory outlet' |
    'fashion retailer' |
    'footwear' |
    'fashion accessories' |
    'fashion designer' |
    'fashion brand';
  address: object;
  location: firestore.GeoPoint;
  locationAccuracy: number;
  locationTimeStamp: number;
  verificationStatus?: string;
  createdAt?: firestore.Timestamp;
  uploads?: object;

  constructor() {

  }

  fromJson(data) {
    this.storeName = data.storeName;
    this.mobileNumber = data.mobileNumber;
    // this.contactNumber = data.contactNumber;
    this.address = data.address;
    this.registerUid = data.registerUid;
    this.gstNumber = data.gstNumber;
    this.typeOfStore = data.typeOfStore;
    this.hasNoGstNumber = data.hasNoGstNumber;
  }

  toJson() {
    return {
      'registerUid': this.registerUid,
      'storeName': this.storeName,
      'mobileNumber': this.mobileNumber,
      // 'contactNumber': this.contactNumber,
      'typeOfStore': this.typeOfStore,
      'gstNumber': this.gstNumber,
      'hasNoGstNumber': this.hasNoGstNumber,
      'address': this.address,
      'location': this.location,
      'locationTimeStamp': this.locationTimeStamp,
      'createdAt': firestore.Timestamp.now(),
    };
  }

}

