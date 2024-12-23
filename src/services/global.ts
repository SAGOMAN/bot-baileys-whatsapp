export class GlobalServices {
    private static instance: GlobalServices;
    
    // Atributos globales para la conexión a la base de datos
    private _db_host: string = '127.0.0.1';
    private _db_database: string = 'chatbot';
    private _db_user: string = 'isaac';
    private _db_password: string = 'isaac';
    private _db_port: number = 3306;

    private constructor() {}

    // Implementación del patrón Singleton
    public static getInstance(): GlobalServices {
        if (!GlobalServices.instance) {
            GlobalServices.instance = new GlobalServices();
        }
        return GlobalServices.instance;
    }

    // Getters y setters para los atributos
    get db_host(): string {
        return this._db_host;
    }

    set db_host(value: string) {
        this._db_host = value;
    }

    get db_database(): string {
        return this._db_database;
    }

    set db_database(value: string) {
        this._db_database = value;
    }

    get db_user(): string {
        return this._db_user;
    }

    set db_user(value: string) {
        this._db_user = value;
    }

    get db_password(): string {
        return this._db_password;
    }

    set db_password(value: string) {
        this._db_password = value;
    }

    get db_port(): number {
        return this._db_port;
    }

    set db_port(value: number) {
        this._db_port = value;
    }
}
