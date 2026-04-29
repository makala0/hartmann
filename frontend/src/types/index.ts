
export interface Order {
    id: number;
    orderId: string;
    orderNumber: string;
    orderBeginDate: string;
    lineType: string;
    sku: string;
    ref: string;
    okCount: number;
    nokCount: number;
    reworkCount: number;
    totalCount: number;
    okPercentage: number;
    recipe: string;
}

export interface Item {
    id: number;
    itemId: string;
    serialNumber: string;
    endInspectionTime: string;
    sku: string;
    ref: string;
    orderNumber: string;
    orderId: string;
    cameraNumber: number;
    defectType: string;
    totalResult: string;
    station1Result: string;
    station2Result: string;
    station3Result: string;
    station1ImagePath: string;
    station2ImagePath: string;
    station3ImagePath: string;
}

export interface OrderDetailWithItems {
    id: number;
    orderId: string;
    orderNumber: string;
    ref: string;
    sku: string;
    okCount: number;
    nokCount: number;
    reworkCount: number;
    totalCount: number;
    okPercentage: number;
    orderBeginDate: string;
    lineType: string;
    recipe: string;
    items: Item[];
}

export interface OrderDetailDto {
    order: Order;
    items: Item[];
    totalItems: number;
    okItems: number;
    nokItems: number;
    reworkItems: number;
}

export interface ItemFilter {
    defectType?: string;
    totalResult?: string;
    cameraNumber?: number;
    dateFrom?: string;
    dateTo?: string;
    serialNumber?: string;
    itemId?: string;
    page?: number;
    size?: number;
}

export interface DashboardStats {
    okCount: number;
    nokCount: number;
    totalRecipes: number;
}

export interface User {
    email: string;
    authorities: string[];
}

export interface OrderFilter {
    lineType?: string;
    orderId?: number;
    orderNumber?: number;
    dateFrom?: string;
    dateTo?: string;
    sku?: string;
    ref?: string;
    recipe?: string;
    page?: number;
    size?: number;
}
