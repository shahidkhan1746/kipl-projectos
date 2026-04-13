import { BaseEntity } from '../shared/entities/base.entity';
export declare class Setting extends BaseEntity {
    key: string;
    value: string;
    label: string;
    category: string;
}
