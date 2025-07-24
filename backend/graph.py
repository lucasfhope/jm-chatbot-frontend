from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.documents import Document
from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient
from langchain.embeddings import OpenAIEmbeddings
from pydantic import BaseModel
from typing import Annotated, TypedDict, Literal, List
from dotenv import load_dotenv

from context import (
    size_context, turkey_context, italian_context,
    cheesesteak_context, chips_context, cookie_context,
    brownie_context, fountain_drink_context
)

load_dotenv()

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0, streaming=True)

client = QdrantClient(url="http://qdrant:6333")
embedding_model = OpenAIEmbeddings(model="text-embedding-3-small")
vectorstore = QdrantVectorStore(
    collection_name="prices", client=client, embedding=embedding_model
)

STATIC_CONTEXT = "\n".join([
    size_context, turkey_context, italian_context,
    cheesesteak_context, chips_context, cookie_context,
    brownie_context, fountain_drink_context
])

# ---------- State ---------- #
class State(TypedDict, total=False):
    messages: Annotated[list, add_messages]
    products: list[str]
    regions: list[str]
    companies: list[str]
    context_docs: list[str]
    callback_config: dict

# ---------- Classification Models ---------- #
class ProductClassifier(BaseModel):
    products: List[Literal[
        "Turkey Sub", "Italian Sub", "Cheesesteak",
        "Chips", "Cookie", "Brownie", "Fountain Drink"
    ]]
    all_products: bool = False

def classify_products(state: State) -> State:
    classifier = llm.with_structured_output(ProductClassifier)
    result = classifier.invoke([
        SystemMessage(content=(
            "Extract only the products explicitly mentioned in the message. "
            "Set `all_products` to true only if the user clearly refers to all products or categories, such as 'entire menu', 'everything', or 'all items'. "
            "If no product is mentioned, return an empty list."
        )),
        HumanMessage(content=state["messages"][-1].content)
    ], config=state.get("callback_config", {}))

    products = result.products
    if result.all_products:
        products = [
            "Turkey Sub", "Italian Sub", "Cheesesteak",
            "Chips", "Cookie", "Brownie", "Fountain Drink"
        ]
    return {"products": products}


class RegionClassifier(BaseModel):
    regions: List[Literal[
        "Boston", "Chicago", "Columbus", "Dallas", "Denver",
        "New York", "Orlando", "Los Angeles", "Raleigh", "Seattle"
    ]]
    all_regions: bool = False

def classify_regions(state: State) -> State:
    classifier = llm.with_structured_output(RegionClassifier)
    result = classifier.invoke([
        SystemMessage(content=(
            "Extract only the cities or regions explicitly mentioned in the message. "
            "Set `all_regions` to true only if the message clearly refers to all cities, nationwide data, or similar. "
            "Do not assume all regions if none are mentioned."
        )),
        HumanMessage(content=state["messages"][-1].content)
    ], config=state.get("callback_config", {}))

    regions = result.regions
    if result.all_regions:
        regions = [
            "Boston", "Chicago", "Columbus", "Dallas", "Denver",
            "New York", "Orlando", "Los Angeles", "Raleigh", "Seattle"
        ]
    return {"regions": regions}


class CompanyClassifier(BaseModel):
    companies: List[Literal[
        "Jersey Mike's", "Jimmy John's", "Firehouse", "Chipotle", "Subway"
    ]]
    all_companies: bool = False

def classify_companies(state: State) -> State:
    classifier = llm.with_structured_output(CompanyClassifier)
    result = classifier.invoke([
        SystemMessage(content=(
            "Extract only the companies (restaurant brands) explicitly mentioned in the message. "
            "Set `all_companies` to true only if the message clearly refers to all companies or brands using phrases like 'all brands', 'every chain', or 'across all companies'. "
            "Do not assume all companies if none are mentioned."
        )),

        HumanMessage(content=state["messages"][-1].content)
    ], config=state.get("callback_config", {}))

    companies = result.companies
    if result.all_companies:
        companies = ["Jersey Mike's", "Jimmy John's", "Firehouse", "Chipotle", "Subway"]

    return {"companies": companies}


# ---------- Retrieval ---------- #
def retrieve_docs(companies: List[str], regions: List[str], k: int = 5) -> List[Document]:
    print("retrieve")
    all_docs = []
    for company in companies:
        for region in regions:
            retriever = vectorstore.as_retriever(search_kwargs={"k": k})
            try:
                docs = retriever.invoke(f"{company} in {region}")
                all_docs.extend(docs)
            except Exception as e:
                print(f"Error retrieving for {company} in {region}: {e}")
    all_docs.insert(0, Document(page_content=STATIC_CONTEXT, metadata={"source": "static_context"}))
    return all_docs

# ---------- Summary ---------- #
def summarize_insights(state: State) -> State:
    companies = state.get("companies", [])
    regions = state.get("regions", [])
    products = state.get("products", [])

    # Check if we should search the vector database
    print(companies, regions)
    should_query_vectorstore = bool(companies) and bool(regions)

    handler = state.get("callback_config", {}).get("callbacks", [None])[0]

    if not should_query_vectorstore:
        # Fallback response: use static context + message history
        fallback_prompt = (
            "Use the conversation history and static context to help the user as a Jersey Mike's analyst."
            "\nAnswer the user's questions and, if applicable, help with Jersey Mike's pricing strategy."
            "\nFormat your response clearly using markdown."
            "\n\nSTATIC CONTEXT:\n===\n" + STATIC_CONTEXT + "\n===\n"
            "\n\nMESSAGES:\n===\n" + "\n".join([m.content for m in state["messages"]]) + "\n===\n"
        )

        if handler:
            llm.invoke([
                SystemMessage(content="You are a helpful price analyst."),
                HumanMessage(content=fallback_prompt)
            ], config=state.get("callback_config", {}))

            return {
                "messages": state["messages"],
                "context_docs": [STATIC_CONTEXT],
                "products": products,
                "regions": regions,
                "companies": companies
            }
        else:
            response = llm.invoke([
                SystemMessage(content="You are a helpful price analyst."),
                HumanMessage(content=fallback_prompt)
            ])
            return {
                "messages": state["messages"] + [response],
                "context_docs": [STATIC_CONTEXT],
                "products": products,
                "regions": regions,
                "companies": companies
            }

    # Otherwise, proceed with database retrieval
    docs = retrieve_docs(companies, regions)
    context = "\n\n".join(doc.page_content for doc in docs)

    detailed_prompt = (
        "You are a Jersey Mike's price analyst. Given the following products, regions, and companies, "
        "use the provided context to summarize the average prices and any business insights."
        "\nOnly include combinations that were specified by the user. If applicable, provide helpful pricing strategy recommendations."
        "\nFormat the response using markdown for clarity, using tables to display the pricing information."
        f"\n\nFocus only on:"
        f"\n- Products: {', '.join(products)}"
        f"\n- Companies: {', '.join(companies)}"
        f"\n- Regions: {', '.join(regions)}"
        "\n\nCONTEXT:\n===\n" + context + "\n===\n"
    )

    if handler:
        llm.invoke([
            SystemMessage(content="You are a helpful price analyst."),
            HumanMessage(content=detailed_prompt)
        ], config=state.get("callback_config", {}))

        return {
            "messages": state["messages"],
            "context_docs": [doc.page_content for doc in docs],
            "products": products,
            "regions": regions,
            "companies": companies
        }
    else:
        response = llm.invoke([
            SystemMessage(content="You are a helpful price analyst."),
            HumanMessage(content=detailed_prompt)
        ])
        return {
            "messages": state["messages"] + [response],
            "context_docs": [doc.page_content for doc in docs],
            "products": products,
            "regions": regions,
            "companies": companies
        }


# ---------- Graph Definition ---------- #
graph = StateGraph(State)
graph.add_node("classify_products", classify_products)
graph.add_node("classify_regions", classify_regions)
graph.add_node("classify_companies", classify_companies)
graph.add_node("summarize_insights", summarize_insights)

graph.add_edge(START, "classify_products")
graph.add_edge("classify_products", "classify_regions")
graph.add_edge("classify_regions", "classify_companies")
graph.add_edge("classify_companies", "summarize_insights")
graph.add_edge("summarize_insights", END)

# ---------- Compile ---------- #
graph = graph.compile() 
