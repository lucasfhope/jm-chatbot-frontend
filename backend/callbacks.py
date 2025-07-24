from queue import Queue, Empty
from langchain.callbacks.base import BaseCallbackHandler


class StreamCallbackHandler(BaseCallbackHandler):
    def __init__(self, timeout: float = 2.0):
        self.queue: Queue[str] = Queue()
        self.timeout = timeout
        self._done = False

    def on_llm_new_token(self, token: str, **kwargs) -> None:
        self.queue.put(token)

    def end(self):
        self._done = True

    def __iter__(self):
        while not self._done or not self.queue.empty():
            try:
                token = self.queue.get(timeout=self.timeout)

                if token.endswith("\n"):
                    stripped = token.rstrip("\n")
                    newlines = "\n" * (len(token) - len(stripped))

                    if stripped:
                        yield f"data: {stripped}\n\n"
                    for _ in newlines:
                        yield "data: \n\n"  # newline token
                else:
                    yield f"data: {token}\n\n"

            except Empty:
                if self._done:
                    break
                continue

        yield "data: [DONE]\n\n"
