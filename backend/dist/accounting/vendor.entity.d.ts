import { BaseEntity } from '../shared/entities/base.entity';
export declare enum VendorCategory {
    MATERIAL_SUPPLIER = "material_supplier",
    SUBCONTRACTOR = "subcontractor",
    EQUIPMENT_HIRE = "equipment_hire",
    LABOUR_CONTRACTOR = "labour_contractor",
    CONSULTANT = "consultant",
    GOVERNMENT = "government",
    OTHER = "other"
}
export declare class Vendor extends BaseEntity {
    name: string;
    tradeName: string;
    category: VendorCategory;
    gstin: string;
    pan: string;
    phone: string;
    email: string;
    address: string;
    bankAccount: Record<string, string>;
    tdsApplicable: boolean;
    tdsRate: number;
    isActive: boolean;
    projectId: string;
}
