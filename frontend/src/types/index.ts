export interface Recipe {
    id: number;
    startTime: string;
    batchId: string;
    specification: string;
    okCount: number;
    nokCount: number;
    totalCount: number;
    successRate: number;
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

export interface RecipeFilter {
    dateFrom?: string;
    dateTo?: string;
    dmCode?: string;
    status?: string;
    page?: number;
    size?: number;
}

// Nové typy pro BatchDetail
export interface Product {
    id: number;
    productId: string;
    dmCode: string;
    eanCode: string;
    timestamp: string;
    status: string;
    stationResults: StationResult[];
}

export interface StationResult {
    id: number;
    station: string;
    result: string;
    timestamp: string;
    defects: Defect[];
}

export interface Defect {
    id: number;
    defectType: string;
    severity: string;
    description: string;
    imagePath?: string;
}

export interface BatchDetailDto {
    recipe: Recipe;
    products: Product[];
    totalProducts: number;
    okProducts: number;
    nokProducts: number;
}