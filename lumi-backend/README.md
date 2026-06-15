# Lumi Africa - Backend API

A modern Go backend for the Lumi Africa e-commerce platform using Gin, GORM, and MySQL with comprehensive Swagger documentation.

## Features

- ✅ **Modern Go Stack**: Gin web framework, GORM ORM, JWT authentication
- ✅ **MySQL Database**: Fully normalized schema with migrations
- ✅ **API Documentation**: Swagger/OpenAPI 3.0 documentation
- ✅ **Role-based Access Control**: ADMIN, VENDOR, CUSTOMER roles
- ✅ **JWT Authentication**: Secure token-based authentication
- ✅ **Docker Support**: Docker Compose for quick setup
- ✅ **Production Ready**: Error handling, logging, middleware

## Project Structure

```
lumi-backend/
├── cmd/
│   └── main.go                 # Application entry point
├── internal/
│   ├── config/                 # Configuration management
│   ├── database/               # Database initialization & migrations
│   ├── handlers/               # HTTP request handlers
│   │   ├── auth.go            # Authentication handlers
│   │   ├── users.go           # User management handlers
│   │   ├── products.go        # Product handlers
│   │   ├── vendors.go         # Vendor handlers
│   │   ├── orders.go          # Order handlers
│   │   └── admin.go           # Admin handlers
│   ├── middleware/             # Custom middleware
│   │   └── auth.go            # JWT middleware
│   ├── models/                 # Data models
│   │   ├── user.go
│   │   ├── product.go
│   │   ├── vendor.go
│   │   └── order.go
│   ├── routes/                 # Route definitions
│   ├── server/                 # Server setup
│   └── utils/                  # Utility functions
├── scripts/
│   └── init.sql               # Database initialization
├── docker-compose.yml          # Docker services
├── go.mod                       # Go dependencies
├── .env.example               # Environment variables template
├── Makefile                    # Build commands
└── README.md
```

## Prerequisites

- **Go 1.21+**
- **MySQL 8.0+**
- **Docker & Docker Compose** (optional)

## Quick Start

### Using Docker

```bash
# Start MySQL and services
make docker-up

# Generate Swagger documentation
make swagger

# Run the application
make run
```

### Manual Setup

```bash
# 1. Clone and navigate to the project
cd lumi-backend

# 2. Install dependencies
go mod download

# 3. Create .env file
cp .env.example .env

# 4. Update .env with your configuration
# Edit .env and set your database credentials

# 5. Start MySQL (ensure it's running on localhost:3306)

# 6. Run the application
make run
```

## API Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `GET /auth/me` - Get current user (requires auth)

### Users
- `PUT /users/profile` - Update profile (requires auth)
- `POST /users/addresses` - Add address (requires auth)
- `GET /users/addresses` - Get addresses (requires auth)
- `DELETE /users/addresses/:addressID` - Delete address (requires auth)

### Admin Routes (requires ADMIN role)
- `GET /admin/users` - List all users
- `POST /admin/users/:userID/disable` - Disable user
- `GET /admin/products` - List all products
- `POST /admin/products/:productID/moderate` - Moderate product
- `GET /admin/vendors` - List vendors
- `POST /admin/vendors/:applicationID/approve` - Approve vendor
- `POST /admin/vendors/:applicationID/reject` - Reject vendor

### Vendor Routes (requires VENDOR role)
- `POST /vendor/products` - Create product
- `GET /vendor/products` - List vendor products
- `PUT /vendor/products/:productID` - Update product
- `DELETE /vendor/products/:productID` - Delete product
- `GET /vendor/orders` - List vendor orders
- `PUT /vendor/orders/:orderID/status` - Update order status

## Environment Variables

```env
SERVER_PORT=8080
SERVER_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root
DB_NAME=lumi_marketplace

JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRY=24h

MAX_UPLOAD_SIZE=10485760
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

## Swagger Documentation

After running the application:

1. Generate Swagger docs: `make swagger`
2. View documentation: `http://localhost:8080/swagger/index.html`

## Available Make Commands

```bash
make build       # Build the application
make run         # Run the application
make test        # Run tests
make swagger     # Generate Swagger documentation
make clean       # Clean build files
make docker-up   # Start Docker containers
make docker-down # Stop Docker containers
make dev         # Run in development mode
```

## Authentication

The API uses JWT (JSON Web Token) for authentication:

1. Get token via login/register
2. Include token in Authorization header:
   ```
   Authorization: Bearer <token>
   ```

## Demo Credentials

```
Admin:
  Email: admin@lumiafrica.com
  Password: admin123

Customer:
  Email: customer@lumiafrica.com
  Password: customer123

Vendor:
  Email: vendor@lumiafrica.com
  Password: vendor123
```

## Database Schema

The database includes:
- **users**: User accounts with roles (CUSTOMER, VENDOR, ADMIN)
- **addresses**: User delivery addresses
- **products**: Product catalog with inventory
- **vendors**: Vendor profiles and information
- **vendor_applications**: Vendor registration applications
- **orders**: Customer orders with items
- **reviews**: Product reviews and ratings

## Error Handling

All API responses follow a consistent format:

### Success Response
```json
{
  "code": 200,
  "message": "Success",
  "data": { }
}
```

### Error Response
```json
{
  "code": 400,
  "message": "Invalid request"
}
```

## Security

- ✅ Password hashing with bcrypt
- ✅ JWT token-based authentication
- ✅ Role-based access control
- ✅ CORS protection
- ✅ Input validation
- ✅ SQL injection prevention (via GORM)

## Development

### Running Tests
```bash
make test
```

### Hot Reload (requires air or similar)
```bash
make dev
```

## Production Deployment

1. Set environment to production: `SERVER_ENV=production`
2. Use a strong JWT secret
3. Configure database with proper credentials
4. Enable HTTPS
5. Set appropriate CORS origins
6. Use reverse proxy (nginx, etc.)

## Contributing

1. Follow Go conventions
2. Write tests for new features
3. Document API endpoints with Swagger comments
4. Keep error messages clear and helpful

## License

MIT License - See LICENSE file for details

## Support

For issues and questions, please open an issue on the repository.
