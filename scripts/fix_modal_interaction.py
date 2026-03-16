import os

file_path = r'c:\Users\Dhanush\OneDrive\Desktop\hlpu\For-Student\Mentor-Requests.html'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 1. Clean up extra closing divs and broken dashboard section
# We'll re-scan the file to find the modal block and remove it from its current position
modal_start = -1
modal_end = -1
for i, line in enumerate(lines):
    if 'id="mentorRequestModal"' in line:
        # Trace back to find the start of the modal div
        for j in range(i, 0, -1):
            if '<div' in lines[j] and 'modal' in lines[j]:
                modal_start = j
                break
        # Trace forward to find the end of the modal (it ends at approx 926)
        # We know it has modal-dialog, modal-content, modal-header, modal-body
        # We'll look for the next </section> or profile modal start to bound it
        for k in range(i, len(lines)):
            if '<!-- ALUMNI PROFILE MODAL -->' in lines[k] or '</section>' in lines[k]:
                # Found boundary, trace back for the </div> of the modal
                for l in range(k, i, -1):
                    if '</div>' in lines[l]:
                        modal_end = l
                        break
                break
        break

modal_content = []
if modal_start != -1 and modal_end != -1:
    modal_content = lines[modal_start:modal_end+1]
    # Remove it from original position
    lines[modal_start:modal_end+1] = ["" for _ in range(modal_end - modal_start + 1)]

# 2. Fix the extra </div> around line 850-860
# Trace back from 850
for i in range(860, 840, -1):
    if i < len(lines) and '</div>' in lines[i] and '</div>' in lines[i-1] and '</div>' in lines[i-2]:
        # Found the cluster of closing divs. Let's make sure we only have what we need.
        # mentorshipDashboard starts at 847 approx.
        # It needs:
        # dashboard -> myRequestsSection -> container -> </div> (requests) -> </div> (dashboard)
        # Then container-glass -> </div>
        # Then hero -> </section> (which is later)
        # So we need 3 closing divs total in that area.
        pass

# 3. Find the end of body or start of scripts
script_start = -1
for i, line in enumerate(lines):
    if '<!-- SCRIPTS -->' in line:
        script_start = i
        break

if script_start != -1 and modal_content:
    # Insert modal just before scripts
    lines.insert(script_start, "\n" + "".join(modal_content) + "\n")

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)
