# Docker Setup for Plot Twister

## Quick Start

### Using Docker Compose (Recommended)

1. **Build and start all services:**
   ```bash
   docker-compose up --build
   ```

2. **Access the application:**
   - Web Application: http://localhost:8000
   - API Documentation: http://localhost:8000/docs
   - PostgreSQL: localhost:5432

3. **Stop the services:**
   ```bash
   docker-compose down
   ```

4. **Stop and remove volumes (clean database):**
   ```bash
   docker-compose down -v
   ```

### Using Dockerfile Only

1. **Build the Docker image:**
   ```bash
   docker build -t plot-twister .
   ```

2. **Run the container:**
   ```bash
   docker run -d \
     --name plot-twister-app \
     -p 8000:8000 \
     -e DATABASE_URL=postgresql://root:root@host.docker.internal:5432/plot_twister \
     plot-twister
   ```

   *Note: Replace `host.docker.internal` with your database host.*

3. **View logs:**
   ```bash
   docker logs -f plot-twister-app
   ```

4. **Stop and remove container:**
   ```bash
   docker stop plot-twister-app
   docker rm plot-twister-app
   ```

## Configuration

### Environment Variables

- `DATABASE_URL`: PostgreSQL connection string (default: `postgresql://root:root@localhost:5432/plot_twister`)
- `PYTHONUNBUFFERED`: Set to `1` for unbuffered output

### Ports

- `8000`: FastAPI application

### Volumes

The docker-compose setup includes:
- `postgres_data`: Persistent PostgreSQL data
- `./src`: Application source code (mounted for development)
- `./src/uploads`: User uploads directory

## Development

### Hot Reload

To enable hot reload during development, the source code is mounted as a volume. Changes to Python files will automatically restart the server.

### Database Migrations

Place your SQL migration files in `src/database/migrations/` directory. They will be automatically executed when the PostgreSQL container starts for the first time.

### Accessing the Database

```bash
# Using docker-compose
docker-compose exec db psql -U root -d plot_twister

# Or from host machine
psql -h localhost -U root -d plot_twister
```

## Production Deployment

For production use:

1. **Update environment variables** in `docker-compose.yml`:
   - Use strong passwords
   - Configure proper CORS origins in the application
   - Set `allow_origins=["*"]` to specific domains

2. **Remove development volumes** (optional):
   - Comment out the `./src:/app/src` volume mount

3. **Use secrets management**:
   - Consider using Docker secrets or external secret managers

4. **Add reverse proxy**:
   - Use Nginx or Traefik in front of the application

## Troubleshooting

### Container won't start
- Check logs: `docker-compose logs web`
- Verify database is ready: `docker-compose logs db`

### Database connection errors
- Ensure the database container is healthy: `docker-compose ps`
- Check DATABASE_URL environment variable
- Verify PostgreSQL is accepting connections

### Port conflicts
- If port 8000 or 5432 is already in use, modify the ports in `docker-compose.yml`

## Useful Commands

```bash
# View running containers
docker-compose ps

# Rebuild a specific service
docker-compose build web

# Run commands in a container
docker-compose exec web python -m pytest

# View logs
docker-compose logs -f web

# Restart a service
docker-compose restart web
```
