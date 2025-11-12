import sys
from llama_cpp import Llama, llama_log_set
from ctypes import CFUNCTYPE, c_int, c_char_p, c_void_p
from typing import List, Dict, Any, Optional, Generator

MODEL_PATH = "Jan-v1-4B-Q4_K_M.gguf"

SYSTEM_PROMPT = """You are a helpful AI assistant. Your primary goal is to assist users with their questions and tasks to the best of your abilities.

When responding:
Answer directly from your knowledge when you can
Be concise, clear, and helpful
Admit when you’re unsure rather than making things up

If tools are available to you:
Only use tools when they add real value to your response
Use tools when the user explicitly asks (e.g., "search for...", "calculate...", "run this code")
Use tools for information you don’t know or that needs verification
Never use tools just because they’re available

When using tools:
Use one tool at a time and wait for results
Use actual values as arguments, not variable names
Learn from each result before deciding next steps
Avoid repeating the same tool call with identical parameters
When asked the latest information, check the current's date first

Remember: Most questions can be answered without tools. Think first whether you need them.
"""

@CFUNCTYPE(None, c_int, c_char_p, c_void_p)
def log_callback(level: c_int, text: c_char_p, user_data: c_void_p):
    """Callback to suppress llama_cpp logs."""
    pass

llama_log_set(log_callback, c_void_p())

class LlamaChat:
    def __init__(
        self,
        model_path: str,
        system_prompt: str = SYSTEM_PROMPT,
        n_ctx: int = 16384,
        n_threads: Optional[int] = None,
        n_gpu_layers: int = -1,
        seed: int = 1337,
        n_parts: int = -1,
        n_batch: int = 512,
        f16_kv: bool = True,
        logits_all: bool = False,
        vocab_only: bool = False,
        use_mmap: bool = True,
        use_mlock: bool = False,
        embedding: bool = False,
        n_ff: int = 0,
        n_threads_batch: Optional[int] = None,
        rope_freq_base: float = 0.0,
        rope_freq_scale: float = 0.0,
        rope_scaling_type: Optional[str] = None,
        last_n_tokens_size: int = 64,
        lora_base: Optional[str] = None,
        lora_path: Optional[str] = None,
        low_vram: bool = False,
        tensor_split: Optional[List[float]] = None,
        chat_format: str = "chatml-function-calling",
        draft_model: Optional[Any] = None,
        **kwargs
    ):
        self.system_prompt = system_prompt
        self.llm = Llama(
            model_path=model_path,
            n_ctx=n_ctx,
            n_threads=n_threads,
            n_gpu_layers=n_gpu_layers,
            seed=seed,
            n_parts=n_parts,
            n_batch=n_batch,
            f16_kv=f16_kv,
            logits_all=logits_all,
            vocab_only=vocab_only,
            use_mmap=use_mmap,
            use_mlock=use_mlock,
            embedding=embedding,
            n_ff=n_ff,
            n_threads_batch=n_threads_batch,
            rope_freq_base=rope_freq_base,
            rope_freq_scale=rope_freq_scale,
            rope_scaling_type=rope_scaling_type,
            last_n_tokens_size=last_n_tokens_size,
            lora_base=lora_base,
            lora_path=lora_path,
            low_vram=low_vram,
            tensor_split=tensor_split,
            chat_format=chat_format,
            draft_model=draft_model,
            verbose=False,
            **kwargs
        )

    def _create_messages(self, user_prompt: str) -> List[Dict[str, str]]:
        return [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": user_prompt}
        ]

    def generate_stream(
        self,
        user_prompt: str,
        temperature: float = 0.7,
        top_p: float = 0.95,
        top_k: int = 40,
        min_p: float = 0.05,
        typical_p: float = 1.0,
        repeat_penalty: float = 1.1,
        presence_penalty: float = 0.0,
        frequency_penalty: float = 0.0,
        tfs_z: float = 1.0,
        mirostat_mode: int = 0,
        mirostat_tau: float = 5.0,
        mirostat_eta: float = 0.1,
        logit_bias: Optional[Dict[str, float]] = None,
        logprobs: Optional[bool] = None,
        top_logprobs: Optional[int] = None,
        stop: Optional[List[str]] = None,
        max_tokens: Optional[int] = None,
        tools: Optional[List[Dict[str, Any]]] = None,
        tool_choice: Optional[Any] = None,
        response_format: Optional[Dict[str, str]] = None,
        grammar: Optional[Any] = None,
        **kwargs
    ) -> Generator[Dict[str, Any], None, None]:
        messages = self._create_messages(user_prompt)
        
        return self.llm.create_chat_completion(
            messages=messages,
            stream=True,
            temperature=temperature,
            top_p=top_p,
            top_k=top_k,
            min_p=min_p,
            typical_p=typical_p,
            repeat_penalty=repeat_penalty,
            presence_penalty=presence_penalty,
            frequency_penalty=frequency_penalty,
            tfs_z=tfs_z,
            mirostat_mode=mirostat_mode,
            mirostat_tau=mirostat_tau,
            mirostat_eta=mirostat_eta,
            logit_bias=logit_bias,
            logprobs=logprobs,
            top_logprobs=top_logprobs,
            stop=stop,
            max_tokens=max_tokens,
            tools=tools,
            tool_choice=tool_choice,
            response_format=response_format,
            grammar=grammar,
            **kwargs
        )

def print_stream(stream: Generator[Dict[str, Any], None, None]):
    for chunk in stream:
        delta = chunk['choices'][0]['delta']
        if 'content' in delta and delta['content'] is not None:
            print(delta['content'], end="", flush=True)

if __name__ == "__main__":
    current_model_path = MODEL_PATH
    current_system_prompt = SYSTEM_PROMPT
    
    chat_bot = LlamaChat(
        model_path=current_model_path,
        system_prompt=current_system_prompt,
        n_gpu_layers=-1
    )
    
    user_prompt = "Hello! Tell me about SRK."
    stream = chat_bot.generate_stream(user_prompt)
    print_stream(stream)