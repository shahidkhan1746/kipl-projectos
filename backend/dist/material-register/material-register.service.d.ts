import { Repository } from 'typeorm';
import { MaterialRegister } from './material-register.entity';
export declare class MaterialRegisterService {
    private repo;
    constructor(repo: Repository<MaterialRegister>);
    create(data: Partial<MaterialRegister>): Promise<MaterialRegister>;
    update(id: string, data: Partial<MaterialRegister>): Promise<MaterialRegister>;
    remove(id: string): Promise<import("typeorm").DeleteResult>;
    list(projectId?: string): Promise<{
        balance: number;
        projectId: string;
        date: string;
        material: string;
        unit: string;
        receivedQty: number;
        consumedQty: number;
        contractorRep: string;
        ueedRep: string;
        remarks: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    summary(projectId?: string): Promise<Record<string, {
        received: number;
        consumed: number;
        balance: number;
        unit: string;
    }>>;
}
