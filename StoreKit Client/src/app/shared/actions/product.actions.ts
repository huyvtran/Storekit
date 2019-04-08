import {SingleProductModel} from '../models/product.model';

export class UploadSingleProduct {
  static readonly type = '[Product] Upload single product';

  constructor(public products: SingleProductModel[]) {
  }
}

export class SingleProductUploadedSuccessfully {
  static readonly type = '[Product] Single product uploaded successfully';
}

export class SingleProductNotUploaded {
  static readonly type = '[Product] Error: Single product not uploaded';

  constructor(public err: string) {
  }
}

export class GetAllProducts {
  static readonly type = '[Product] Get all products';

  constructor(public storeId: string) {
  }
}

export class GotAllProducts {
  static readonly type = '[Product] Got all products';

  constructor(public allProduct: any[]) {
  }
}

export class GetAllProductsError {
  static readonly type = '[Product] Error: Get all products';

  constructor(public err: string) {
  }
}

export class DeleteAProduct {
  static readonly type = '[Product] Delete product';

  constructor(public productUid: string) {
  }
}

export class ProductDeletedSuccessfully {
  static readonly type = '[Product] product deleted successfully';
}

export class ErrorInDeletingProduct {
  static readonly type = '[Product] Error: While deleting product';

  constructor(public err: string) {
  }
}

export class SearchForProduct {
  static readonly type = '[Product] Search for product';

  constructor(public  searchQuery: {storeId: string, query: string}) {
  }
}

export class ProductFounded {
  static readonly type = '[Product] Product founded';

  constructor(public resultProducts: any[]) {
  }
}

export class ErrorInProductSearch {
  static readonly type = '[Product] Error: error in Product search';

  constructor(public  err: string) {
  }
}

export class GetProductByUid {
  static readonly type = '[Product] Getting product by uid';

  constructor(public productUid: string) {
  }
}

export class GotProductByUid {
  static readonly type = '[Product] Got product by uid';

  constructor(public product: object) {
  }
}

export class ErrorInGettingProductByUid {
  static readonly type = '[Product] Error: error in getting product by uid';

  constructor(public err: string) {
  }
}

export class EditProductByUid {
  static readonly type = '[Product] Edit product by uid';

  constructor(public product: object) {
  }
}

export class ProductEditedSuccessfully {
  static readonly type = '[Product] Product edited successfully by uid';
}

export class ErrorInEditingProductByUid {
  static readonly type = '[Product] Error: error in Editing product by uid';

  constructor(public err: string) {
  }
}
