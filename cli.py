import json
import re
import sys
from typing import List, Dict, Any, Generator

from aigguf import LlamaChat, MODEL_PATH
from websearch import searchWeb
from webcrawl import crawlUrls

tools = [
    {
        "type": "function",
        "function": {
            "name": "searchWeb",
            "description": "Searches the web for a given query and returns a list of results.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query.",
                    }
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "crawlUrls",
            "description": "Crawls a list of URLs and returns their content.",
            "parameters": {
                "type": "object",
                "properties": {
                    "sourceUrls": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "A list of URLs to crawl.",
                    }
                },
                "required": ["sourceUrls"],
            },
        },
    },
]

def create_system_prompt(tools: List[Dict[str, Any]]) -> str:
    tool_descriptions = []
    for tool in tools:
        function = tool.get("function", {})
        name = function.get("name")
        description = function.get("description")
        parameters = function.get("parameters", {}).get("properties", {})

        param_details = ", ".join(
            f"{pname}: {p.get('type')}" for pname, p in parameters.items()
        )
        tool_descriptions.append(f"- `{name}({param_details})`: {description}")

    return (
        "You are a helpful AI assistant with access to the following tools. "
        "Use them when necessary to answer user questions.\n\n"
        + "\n".join(tool_descriptions)
        + "\n\nThink step-by-step about whether you need to use a tool. "
        "If you do, call the tool with the correct arguments. "
        "After you get the result, continue with your thought process to answer the user's question."
    )

def main():
    """
    Main function to run the CLI chat application.
    """
    system_prompt = create_system_prompt(tools)

    chat_bot = LlamaChat(
        model_path=MODEL_PATH,
        system_prompt=system_prompt,
        n_gpu_layers=-1,
        n_ctx=4096
    )

    messages = [{"role": "system", "content": system_prompt}]

    print("Chat with the model. Type 'exit' or 'quit' to end.")

    while True:
        try:
            user_prompt = input("> ")
            if user_prompt.lower() in ["exit", "quit"]:
                break
        except (KeyboardInterrupt, EOFError):
            break

        messages.append({"role": "user", "content": user_prompt})

        # --- First model call to get reasoning and potential tool calls ---
        response = chat_bot.llm.create_chat_completion(
            messages=messages,
            tools=tools,
            tool_choice="auto",
        )

        assistant_response = response['choices'][0]['message']
        messages.append(assistant_response)

        tool_calls = assistant_response.get("tool_calls", [])

        # --- If there are tool calls, execute them ---
        if tool_calls:
            available_functions = {"searchWeb": searchWeb, "crawlUrls": crawlUrls}

            for tool_call in tool_calls:
                function_name = tool_call["function"]["name"]
                function_to_call = available_functions.get(function_name)

                if function_to_call:
                    try:
                        function_args = json.loads(tool_call["function"]["arguments"])
                        print(f"Reasoning: Executing tool '{function_name}' with arguments: {json.dumps(function_args, indent=2)}")

                        function_response = function_to_call(**function_args)

                        messages.append({
                            "role": "tool",
                            "tool_call_id": tool_call["id"],
                            "name": function_name,
                            "content": json.dumps(function_response),
                        })
                    except Exception as e:
                        print(f"Error executing tool {function_name}: {e}")
                        messages.append({
                            "role": "tool",
                            "tool_call_id": tool_call["id"],
                            "name": function_name,
                            "content": f'{{"error": "{str(e)}"}}',
                        })
                else:
                    print(f"Reasoning: Tool '{function_name}' not found.")
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call["id"],
                        "name": function_name,
                        "content": f'{{"error": "Function not found"}}',
                    })
        # --- If the model returns a JSON blob, parse it and execute the tool ---
        elif assistant_response.get("content"):
            json_match = re.search(r"```json\n(.*?)\n```", assistant_response["content"], re.DOTALL)
            if json_match:
                try:
                    tool_call = json.loads(json_match.group(1))
                    function_name = tool_call.get("action")
                    function_args = tool_call.get("query")

                    available_functions = {"websearch": searchWeb, "webcrawl": crawlUrls}
                    function_to_call = available_functions.get(function_name)

                    if function_to_call:
                        print(f"Reasoning: Executing tool '{function_name}' with arguments: {json.dumps(function_args, indent=2)}")

                        # The websearch function expects a single query string, not a dictionary
                        if function_name == "websearch":
                            function_response = function_to_call(function_args)
                        else:
                            function_response = function_to_call(**function_args)

                        messages.append({
                            "role": "tool",
                            "name": function_name,
                            "content": json.dumps(function_response),
                        })

                except (json.JSONDecodeError, KeyError) as e:
                    print(f"Error parsing or executing tool call from JSON: {e}")

        # --- Second model call with tool results ---
        if tool_calls or (assistant_response.get("content") and "```json" in assistant_response["content"]):
            second_stream = chat_bot.llm.create_chat_completion(
                messages=messages,
                stream=True,
            )

            print("Assistant: ", end="")
            final_content = ""
            for chunk in second_stream:
                delta = chunk['choices'][0]['delta']
                if 'content' in delta and delta['content'] is not None:
                    content = delta['content']
                    print(content, end="", flush=True)
                    final_content += content
            print()

            messages.append({"role": "assistant", "content": final_content})
        else:
            print("Assistant:", assistant_response.get("content"))


if __name__ == "__main__":
    main()
