import { BaseEntity } from '../shared/entities/base.entity';
export declare class AiKey extends BaseEntity {
    label: string;
    provider: string;
    apiKey: string;
    model: string;
    baseUrl: string;
    enabled: boolean;
    priority: number;
}
