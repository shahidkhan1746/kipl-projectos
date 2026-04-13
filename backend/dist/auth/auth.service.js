"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const crypto_1 = require("crypto");
const bcrypt = __importStar(require("bcryptjs"));
const users_service_1 = require("../users/users.service");
const refresh_token_entity_1 = require("./refresh-token.entity");
let AuthService = class AuthService {
    usersService;
    jwtService;
    config;
    refreshRepo;
    constructor(usersService, jwtService, config, refreshRepo) {
        this.usersService = usersService;
        this.jwtService = jwtService;
        this.config = config;
        this.refreshRepo = refreshRepo;
    }
    async login(email, password) {
        const user = await this.usersService.findByEmail(email);
        const hash = user?.passwordHash ?? '$2b$12$placeholder.hash.prevents.timing.attack';
        const valid = await bcrypt.compare(password, hash);
        if (!user || !valid || !user.isActive) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const [accessToken, refreshToken] = await Promise.all([
            this.signAccess(user.id, user.role),
            this.signRefresh(user.id),
        ]);
        const tokenHash = (0, crypto_1.createHash)('sha256').update(refreshToken).digest('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        await this.refreshRepo.save(this.refreshRepo.create({ user, tokenHash, expiresAt }));
        await this.usersService.updateLastLogin(user.id);
        return {
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_in: 900,
            user: {
                id: user.id, name: user.name,
                email: user.email, role: user.role,
            },
        };
    }
    async refresh(refreshToken) {
        let payload;
        try {
            payload = this.jwtService.verify(refreshToken, {
                secret: this.config.get('JWT_REFRESH_SECRET'),
            });
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
        const hash = (0, crypto_1.createHash)('sha256').update(refreshToken).digest('hex');
        const stored = await this.refreshRepo.findOne({
            where: { tokenHash: hash },
            relations: ['user'],
        });
        if (!stored || stored.expiresAt < new Date() || !stored.user.isActive) {
            throw new common_1.UnauthorizedException('Refresh token expired or revoked');
        }
        return {
            access_token: await this.signAccess(stored.user.id, stored.user.role),
            expires_in: 900,
        };
    }
    async logout(refreshToken) {
        const hash = (0, crypto_1.createHash)('sha256').update(refreshToken).digest('hex');
        await this.refreshRepo.delete({ tokenHash: hash });
    }
    signAccess(userId, role) {
        return this.jwtService.signAsync({ sub: userId, role }, { secret: this.config.get('JWT_SECRET'), expiresIn: this.config.get('JWT_EXPIRES_IN') ?? '15m' });
    }
    signRefresh(userId) {
        return this.jwtService.signAsync({ sub: userId, type: 'refresh' }, { secret: this.config.get('JWT_REFRESH_SECRET'), expiresIn: '7d' });
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, typeorm_1.InjectRepository)(refresh_token_entity_1.RefreshToken)),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService,
        config_1.ConfigService,
        typeorm_2.Repository])
], AuthService);
//# sourceMappingURL=auth.service.js.map