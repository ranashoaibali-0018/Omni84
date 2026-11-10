"""
OmniAgent - Personal AI Assistant (Streamlit Web App)
Requirements:
    pip install streamlit google-genai python-dotenv
Run:
    streamlit run app.py
"""
import os
import streamlit as st
from google import genai
from google.genai import types
from dotenv import load_dotenv

# Load environment variables if available
load_dotenv()

# Page Configuration
st.set_page_config(
    page_title="OmniAgent - Personal AI Assistant",
    page_icon="🤖",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom Styling
st.markdown("""
<style>
    .main-header {
        font-size: 2.2rem;
        font-weight: 700;
        background: linear-gradient(90deg, #2563eb, #7c3aed);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 0.2rem;
    }
    .sub-header {
        color: #64748b;
        margin-bottom: 1.5rem;
    }
    .confirm-box {
        padding: 1.2rem;
        border-radius: 10px;
        background-color: #fff7ed;
        border: 2px solid #f97316;
        margin-top: 1rem;
        margin-bottom: 1rem;
    }
</style>
""", unsafe_allow_html=True)

# Initialize Session State
if "messages" not in st.session_state:
    st.session_state.messages = []
if "saved_files" not in st.session_state:
    st.session_state.saved_files = []
if "pending_save" not in st.session_state:
    st.session_state.pending_save = None

# Sidebar Configuration
with st.sidebar:
    st.title("⚙️ Agent Settings")
    
    # API Key Input
    env_api_key = os.getenv("GEMINI_API_KEY", "")
    api_key = st.text_input(
        "Gemini API Key",
        value=env_api_key,
        type="password",
        help="Get your free API key at https://aistudio.google.com/app/apikey"
    )
    
    st.divider()
    
    # Assistant Mode
    mode = st.selectbox(
        "Assistant Mode",
        [
            "General Assistant",
            "30 Freelance & Micro-Tasks Specialist",
            "Research & Market Trends",
            "YouTube Script Studio",
            "Content Creator (Blogs/Posts)",
            "Executive Email Drafter"
        ]
    )
    
    # Live Web Search Toggle
    use_search = st.toggle("🌐 Live Google Search Grounding", value=True, help="Fetch real-time information from the internet")
    
    st.divider()
    
    # Critical Action Shield Status
    st.markdown("### 🛡️ Human-in-the-Loop")
    st.caption("Active: Critical file saves require your explicit 'Yes/No' confirmation before writing to disk.")
    
    if st.button("🗑️ Clear Chat History"):
        st.session_state.messages = []
        st.session_state.pending_save = None
        st.rerun()

# Main Header
st.markdown('<div class="main-header">OmniAgent Personal Assistant</div>', unsafe_allow_html=True)
st.markdown('<div class="sub-header">Your autonomous partner for research, content, YouTube scripts, and emails.</div>', unsafe_allow_html=True)

# Guard: API Key check
if not api_key:
    st.warning("⚠️ Please enter your Gemini API Key in the left sidebar to start. You can get one for free at aistudio.google.com.")
    st.stop()

# Initialize Gemini Client
try:
    client = genai.Client(api_key=api_key)
except Exception as e:
    st.error(f"Failed to initialize Gemini Client: {e}")
    st.stop()

# System Instruction Mapping
SYSTEM_PROMPTS = {
    "General Assistant": "You are OmniAgent, a versatile personal assistant. Answer thoroughly and accurately.",
    "30 Freelance & Micro-Tasks Specialist": "You are a master Freelancing & Micro-Task specialist. You assist with all 30 online tasks (Data Entry, Excel formulas, Copy-Paste, Surveys, Image Annotation, AI Training, App Testing, SEO, Lead Gen, Translation, Transcriptions, Content, Video & 3D scripts). Provide immediate, professional, ready-to-deliver outputs.",
    "Research & Market Trends": "You are a Senior Research Analyst. Provide comprehensive research briefs, trending products, market signals, bullet points, and source citations.",
    "YouTube Script Studio": "You are a Viral YouTube Scriptwriter. Output complete scripts with suggested titles, hooks (0:00-0:30), visual/B-roll cues, host dialogue, and high-converting CTAs.",
    "Content Creator (Blogs/Posts)": "You are a master Content Strategist. Craft publication-ready articles, social posts, or newsletters with punchy hooks and structured subheadings.",
    "Executive Email Drafter": "You are an Executive Communications Specialist. Draft crisp, polite, high-converting emails with 3 subject line options and clear calls to action."
}

# Display Chat History
for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])
        if "sources" in msg and msg["sources"]:
            with st.expander("🔗 Live Search Sources"):
                for src in msg["sources"]:
                    st.markdown(f"- [{src.get('title', 'Source')}]({src.get('uri', '#')})")

# Check for Pending Critical Action (Confirmation Dialog)
if st.session_state.pending_save:
    pending = st.session_state.pending_save
    st.markdown('<div class="confirm-box">', unsafe_allow_html=True)
    st.warning("⚠️ **CRITICAL ACTION CONFIRMATION**")
    st.markdown(f"The agent wants to save the generated document to your computer disk as: **\`{pending['filename']}\`** ({len(pending['content'])} characters).")
    st.markdown("### **Do you want to proceed?**")
    
    col1, col2 = st.columns([1, 1])
    with col1:
        if st.button("✅ Yes, Proceed and Save to Disk", type="primary", use_container_width=True):
            try:
                # Write file safely
                os.makedirs("saved_agent_files", exist_ok=True)
                file_path = os.path.join("saved_agent_files", pending["filename"])
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(pending["content"])
                
                st.session_state.saved_files.append({
                    "filename": pending["filename"],
                    "path": file_path,
                    "preview": pending["content"][:200]
                })
                st.session_state.pending_save = None
                st.success(f"🎉 File successfully saved to: \`{file_path}\`")
                st.balloons()
                st.rerun()
            except Exception as err:
                st.error(f"Error writing file: {err}")
    with col2:
        if st.button("❌ No, Cancel Saving", use_container_width=True):
            st.session_state.pending_save = None
            st.info("Action cancelled by user. No file was saved to disk.")
            st.rerun()
    st.markdown('</div>', unsafe_allow_html=True)

# User Chat Input
user_input = st.chat_input("Ask your assistant (e.g., 'Research trending AI tools', 'Plan a YouTube script on productivity', 'Draft an email')...")

if user_input:
    # Append user message
    st.session_state.messages.append({"role": "user", "content": user_input})
    with st.chat_message("user"):
        st.markdown(user_input)
    
    # Generate Assistant Response
    with st.chat_message("assistant"):
        with st.spinner("🤖 Agent is thinking and researching live web..."):
            try:
                # Setup configuration
                tools = []
                if use_search:
                    tools.append(types.Tool(google_search=types.GoogleSearch()))
                
                config = types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPTS.get(mode, "You are a helpful AI assistant."),
                    tools=tools if tools else None
                )
                
                response = client.models.generate_content(
                    model="gemini-3.8-flash",
                    contents=user_input,
                    config=config
                )
                
                response_text = response.text or ""
                st.markdown(response_text)
                
                # Extract grounding citations
                sources = []
                if response.candidates and response.candidates[0].grounding_metadata:
                    metadata = response.candidates[0].grounding_metadata
                    if metadata.grounding_chunks:
                        for chunk in metadata.grounding_chunks:
                            if chunk.web and chunk.web.uri:
                                sources.append({
                                    "title": chunk.web.title or chunk.web.uri,
                                    "uri": chunk.web.uri
                                })
                
                if sources:
                    with st.expander("🔗 Live Search Sources"):
                        for src in sources:
                            st.markdown(f"- [{src['title']}]({src['uri']})")
                
                # Save to session
                st.session_state.messages.append({
                    "role": "assistant",
                    "content": response_text,
                    "sources": sources
                })
                
                # Check if generated content should prompt a critical save action
                if len(response_text) > 250:
                    suggested_filename = f"{mode.lower().replace(' ', '_')}_{len(st.session_state.messages)}.md"
                    st.session_state.pending_save = {
                        "filename": suggested_filename,
                        "content": response_text
                    }
                    st.rerun()
                    
            except Exception as e:
                st.error(f"Error calling Gemini: {e}")

# Sidebar Saved Files List
with st.sidebar:
    if st.session_state.saved_files:
        st.divider()
        st.subheader("📁 Saved Local Files")
        for f in st.session_state.saved_files:
            st.caption(f"📄 **{f['filename']}**")
