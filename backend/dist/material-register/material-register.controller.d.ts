import { MaterialRegisterService } from './material-register.service';
export declare class MaterialRegisterController {
    private readonly svc;
    constructor(svc: MaterialRegisterService);
    list(pid: string): Promise<{
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
    summary(pid: string): Promise<Record<string, {
        received: number;
        consumed: number;
        balance: number;
        unit: string;
    }>>;
    create(body: any): Promise<import("./material-register.entity").MaterialRegister>;
    update(id: string, body: any): Promise<import("./material-register.entity").MaterialRegister>;
    remove(id: string): Promise<import("typeorm").DeleteResult>;
}
