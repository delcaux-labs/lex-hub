import requests
import json
import time
import sys

# Ensure UTF-8 output on Windows console
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

BASE_URL = "http://localhost:5001"
PDF_PATH = "Loi-Communications-Electroniques.pdf"

def convert_pdf_range(start_page=1, end_page=3):
    print(f"\n=======================================================")
    print(f"Testing OCR on '{PDF_PATH}' (pages {start_page} to {end_page})...")
    print(f"=======================================================")
    
    session = requests.Session()
    
    # 1. Health check
    health_res = session.get(f"{BASE_URL}/health")
    print(f"Docling Serve Health Check: {health_res.status_code} - {health_res.text}")
    assert health_res.status_code == 200, "Health check failed"
    
    # 2. Submit async task
    async_url = f"{BASE_URL}/v1/convert/file/async"
    
    with open(PDF_PATH, "rb") as f:
        files = {
            "files": (PDF_PATH, f, "application/pdf")
        }
        data = {
            "pipeline": "vlm",
            "vlm_pipeline_preset": "openrouter_minimax",
            "page_range": [start_page, end_page],
            "to_formats": ["md"]
        }
        submit_res = session.post(async_url, files=files, data=data)
        
    print(f"Submission status: {submit_res.status_code}")
    assert submit_res.status_code == 200, f"Submit failed: {submit_res.text}"
    
    submit_json = submit_res.json()
    task_id = submit_json.get("task_id")
    print(f"Task successfully enqueued with Task ID: {task_id}")
    
    # 3. Poll for completion
    poll_url = f"{BASE_URL}/v1/status/poll/{task_id}"
    result_url = f"{BASE_URL}/v1/result/{task_id}"
    
    start_time = time.time()
    while True:
        try:
            status_res = session.get(poll_url, timeout=10)
            if status_res.status_code == 200:
                data = status_res.json()
                task_status = data.get("task_status")
                elapsed = time.time() - start_time
                print(f"[{elapsed:.1f}s] Task status: {task_status}")
                
                if task_status in ("success", "SUCCESS", "completed", "COMPLETED"):
                    break
                elif task_status in ("failed", "FAILED", "failure", "error"):
                    raise RuntimeError(f"Task failed: {data}")
        except requests.exceptions.RequestException as e:
            print(f"Warning during polling: {e}")
            
        time.sleep(3)
        
    total_time = time.time() - start_time
    print(f"\nTask completed in {total_time:.2f} seconds!")
    
    # 4. Fetch result
    result_res = session.get(result_url)
    assert result_res.status_code == 200, f"Failed to fetch result: {result_res.text}"
    
    result_data = result_res.json()
    doc = result_data.get("document", {})
    md_content = doc.get("md_content", "")
    
    print("\n" + "="*70)
    print(f"CONVERTED MARKDOWN OUTPUT (Pages {start_page}-{end_page}):")
    print("="*70)
    print(md_content)
    print("="*70)
    print(f"\nDocument summary:")
    print(f"- Character count: {len(md_content)}")
    print(f"- Line count: {len(md_content.splitlines())}")
    print(f"- Status: {result_data.get('status')}")
    print(f"- Processing time (server reported): {result_data.get('processing_time')}s")
    
    # Save output to file for verification
    out_file = f"scratch/ocr_output_pages_{start_page}_{end_page}.md"
    with open(out_file, "w", encoding="utf-8") as f:
        f.write(md_content)
    print(f"Saved full output to: {out_file}")
    return md_content

if __name__ == "__main__":
    convert_pdf_range(start_page=1, end_page=3)
