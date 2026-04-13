import { Repository } from 'typeorm';
import { Setting } from './setting.entity';
export declare class SettingsService {
    private repo;
    constructor(repo: Repository<Setting>);
    get(key: string): Promise<string | null>;
    set(key: string, value: string, label?: string, category?: string): Promise<Setting>;
    getAll(category?: string): Promise<Setting[]>;
    setBulk(settings: Array<{
        key: string;
        value: string;
        label?: string;
        category?: string;
    }>): Promise<void>;
}
