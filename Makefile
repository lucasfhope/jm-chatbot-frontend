up:
	docker compose up -d

down:
	docker compose down

ingest:
	docker compose exec backend poetry run python ingest_to_qdrant.py $(file)


run:
	docker compose exec backend poetry run python -m graph

app:
	docker compose exec backend poetry run flask --app app run --host=0.0.0.0 --port=8000

