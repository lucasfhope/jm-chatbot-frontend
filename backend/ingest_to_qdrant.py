import os
import uuid
from pathlib import Path
from typing import List
from dotenv import load_dotenv
import pandas as pd
from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Qdrant
from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams

from utils import normalize_text  # Assuming this is your own function


def write_excel_to_qdrant(excel_path: str, collection_name: str = "prices", host: str = "qdrant", port: int = 6333):
    path = Path(excel_path)
    if not path.exists() or path.suffix not in [".xlsx", ".xls"]:
        raise ValueError(f"Invalid file path: {excel_path}")

    sheet_map = pd.read_excel(path, sheet_name=None, header=None)
    docs: List[Document] = []

    for sheet_name, df in sheet_map.items():
        if df.shape[0] < 3:
            continue

        company = normalize_text(sheet_name.replace(" Prices", "").strip())
        df.columns = df.iloc[1].astype(str).str.strip()
        df = df.drop(index=[0, 1]).dropna(how="all")

        for _, row in df.iterrows():
            row_dict = row.to_dict()
            date = normalize_text(str(row_dict.get("Date", "")))
            region = normalize_text(str(row_dict.get("Region", "Unknown")))
            address = normalize_text(str(row_dict.get("Store Address", "Unknown")))

            price_parts = [
                f"{col.strip()}: {normalize_text(str(val)).strip()}"
                for col, val in row_dict.items()
                if col not in ["Date", "Region", "Store Address"] and pd.notna(val)
            ]
            if not price_parts:
                continue

            page_content = f"company: {company} | region: {region} | date: {date} | " + " | ".join(price_parts)

            doc = Document(
                page_content=page_content,
                metadata={
                    "company": company,
                    "region": region,
                    "date": date,
                    "address": address
                }
            )
            docs.append(doc)

    if not docs:
        print("⚠️ No valid rows found to ingest.")
        return

    print(f"🔍 Embedding and uploading {len(docs)} documents...")

    # Load API key from .env and set up embedding
    load_dotenv()
    embedding = OpenAIEmbeddings(model="text-embedding-3-small")

    # Create the collection manually (outside LangChain) if it doesn't exist
    qdrant_client = QdrantClient(host=host, port=port, timeout=10.0, prefer_grpc=False)
    existing = [c.name for c in qdrant_client.get_collections().collections]

    if collection_name not in existing:
        sample_vec = embedding.embed_query("sample")
        qdrant_client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(size=len(sample_vec), distance=Distance.COSINE),
        )
        print(f"📦 Created collection `{collection_name}`")

    # Let LangChain handle its own Qdrant client internally
    Qdrant.from_documents(
        documents=docs,
        embedding=embedding,
        url=f"http://{host}:{port}",
        collection_name=collection_name,
    )

    print(f"✅ Ingested {len(docs)} records into `{collection_name}`")


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python ingest_to_qdrant.py <path_to_excel>")
    else:
        write_excel_to_qdrant(sys.argv[1])
