import { SettingsService } from './settings.service';
export declare class SettingsController {
    private readonly svc;
    constructor(svc: SettingsService);
    getAll(category?: string): Promise<import("./setting.entity").Setting[]>;
    get(key: string): Promise<{
        key: string;
        value: string | null;
    }>;
    set(body: {
        key: string;
        value: string;
        label?: string;
        category?: string;
    }): Promise<import("./setting.entity").Setting>;
    setBulk(body: Array<{
        key: string;
        value: string;
        label?: string;
        category?: string;
    }>): Promise<void>;
}
