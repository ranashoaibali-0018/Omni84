"""
OmniAgent - Personal AI Assistant (Command Line Interface)
Requirements:
    pip install google-genai python-dotenv rich
Run:
    python agent_cli.py
"""
import os
import sys
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

# Setup terminal styling using rich
try:
    from rich.console import Console
    from rich.panel import Panel
    from rich.markdown import Markdown
    from rich.prompt import Prompt, Confirm
    console = Console()
except ImportError:
    class Console:
        def print(self, *args, **kwargs):
            print(*args)
    console = Console()
    Panel = lambda x, **kw: x
    Markdown = lambda x: x
    class Confirm:
        @staticmethod
        def ask(prompt):
            res = input(f"{prompt} (yes/no): ").strip().lower()
            return res in ["yes", "y"]
    class Prompt:
        @staticmethod
        def ask(prompt, default=None):
            val = input(f"{prompt} [{default}]: ") if default else input(f"{prompt}: ")
            return val or default

def main():
    console.print("\n" + "="*60, style="bold cyan")
    console.print("   🤖 OMNIAGENT: Personal AI Assistant (Windows CLI)", style="bold green")
    console.print("   Research | Content | YouTube Scripts | Emails", style="dim")
    console.print("="*60 + "\n", style="bold cyan")
    
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        api_key = Prompt.ask("🔑 Please enter your Gemini API Key")
        if not api_key:
            console.print("❌ Gemini API Key is required to run OmniAgent. Exiting.", style="bold red")
            sys.exit(1)
            
    client = genai.Client(api_key=api_key)
    
    MODES = {
        "1": ("General Assistant", "You are a versatile personal assistant."),
        "2": ("Research Assistant", "You are a Senior Research Analyst. Synthesize facts, market trends, and cite sources."),
        "3": ("YouTube Script Studio", "You are a Viral YouTube Scriptwriter. Output full scripts with hooks, visual cues, and CTAs."),
        "4": ("Executive Email Drafter", "You are an Executive Communications Specialist. Draft concise emails with 3 subject line options.")
    }
    
    console.print("Select Operating Mode:")
    for k, v in MODES.items():
        console.print(f"  [{k}] {v[0]}")
    mode_choice = Prompt.ask("Choose mode number", default="1")
    mode_name, system_prompt = MODES.get(mode_choice, MODES["1"])
    console.print(f"✅ Active Mode: [bold cyan]{mode_name}[/bold cyan]\n")
    
    os.makedirs("saved_agent_files", exist_ok=True)
    
    while True:
        console.print("\n[bold yellow]Enter your prompt[/bold yellow] (or type 'quit' / 'exit'):")
        user_input = input(">> ").strip()
        
        if user_input.lower() in ["quit", "exit", "q"]:
            console.print("👋 Goodbye!", style="bold green")
            break
            
        if not user_input:
            continue
            
        console.print("\n⏳ [cyan]Searching live web & generating response with Gemini...[/cyan]")
        
        try:
            # Enable Google Search Grounding for live internet retrieval
            tools = [types.Tool(google_search=types.GoogleSearch())]
            config = types.GenerateContentConfig(
                system_instruction=system_prompt,
                tools=tools
            )
            
            response = client.models.generate_content(
                model="gemini-3.8-flash",
                contents=user_input,
                config=config
            )
            
            output_text = response.text or ""
            
            # Print Markdown response
            console.print("\n" + "-"*50)
            console.print(Markdown(output_text))
            console.print("-"*50)
            
            # Print sources if available
            if response.candidates and response.candidates[0].grounding_metadata:
                metadata = response.candidates[0].grounding_metadata
                if metadata.grounding_chunks:
                    console.print("\n🌐 [bold]Live Search Grounding Sources:[/bold]")
                    for chunk in metadata.grounding_chunks:
                        if chunk.web and chunk.web.uri:
                            console.print(f" • [link={chunk.web.uri}]{chunk.web.title or chunk.web.uri}[/link]")
                            
            # CRITICAL ACTION CONFIRMATION FLOW
            if len(output_text) > 200:
                default_name = f"{mode_name.lower().replace(' ', '_')}.md"
                console.print(f"\n⚠️  [bold yellow]CRITICAL ACTION PROMPT:[/bold yellow]")
                wants_save = Confirm.ask(f"Do you want to proceed and save this output to 'saved_agent_files/{default_name}'?")
                
                if wants_save:
                    target_filename = Prompt.ask("Confirm or modify filename", default=default_name)
                    file_path = os.path.join("saved_agent_files", target_filename)
                    with open(file_path, "w", encoding="utf-8") as f:
                        f.write(output_text)
                    console.print(f"✅ [bold green]Confirmed & Saved successfully to:[/bold green] {file_path}")
                else:
                    console.print("🛑 [dim]Action cancelled. No file was saved.[/dim]")
                    
        except Exception as err:
            console.print(f"❌ Error: {err}", style="bold red")

if __name__ == "__main__":
    main()
