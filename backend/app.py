from flask import Flask, request, Response
from langchain_core.messages import HumanMessage
from flask_cors import CORS
from callbacks import StreamCallbackHandler  # your custom class
from graph import graph, summarize_insights # your compiled LangGraph

app = Flask(__name__)

CORS(app)

@app.route("/query_chatbot", methods=["POST"])
def generate():
    data = request.json
    messages = data.get("messages", [])

    def generate_stream():
        # Step 1: Run classification steps (no streaming here)
        state = {
            "messages": [HumanMessage(content=messages[-1]["content"])]
        }
        intermediate_state = graph.invoke(state)

        # Step 2: Stream just the summarization
        handler = StreamCallbackHandler()
        summarize_insights({
            **intermediate_state,
            "callback_config": {"callbacks": [handler]}
        })
        handler.end()
        yield from handler

    return Response(generate_stream(), mimetype="text/event-stream")




if __name__ == "__main__":
    app.run(debug=True, port=8000)
