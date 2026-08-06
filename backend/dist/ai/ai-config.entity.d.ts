import { BaseEntity } from '../shared/entities/base.entity';
export declare class AiConfig extends BaseEntity {
    enabled: boolean;
    provider: string;
    apiKey: string;
    model: string;
    baseUrl: string;
}
