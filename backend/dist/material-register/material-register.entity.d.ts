import { BaseEntity } from '../shared/entities/base.entity';
export declare class MaterialRegister extends BaseEntity {
    projectId: string;
    date: string;
    material: string;
    unit: string;
    receivedQty: number;
    consumedQty: number;
    contractorRep: string;
    ueedRep: string;
    remarks: string;
}
