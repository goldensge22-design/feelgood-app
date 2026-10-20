"""Package only this review's delta; never push, deploy, or replace app sources."""
from pathlib import Path
import base64, difflib, hashlib, html, json, os, shutil, subprocess, tempfile, zipfile

root = Path.cwd()
out = root / "generated-artifacts/nuvia-task-add"
before = out / "before"
source = root / "artifacts/nuvia-ui-review/src/studio"
prefix = "artifacts/nuvia-ui-review/src/studio/"
base = (out / "base-commit.txt").read_text().strip()
sha = lambda b: hashlib.sha256(b).hexdigest()
changes, patch = [], []
for name in sorted({p.name for p in before.iterdir()} | {p.name for p in source.iterdir()}):
    a, b = before / name, source / name
    old, new = a.read_bytes() if a.is_file() else None, b.read_bytes() if b.is_file() else None
    if old == new:
        continue
    path = prefix + name
    committed = subprocess.run(["git", "show", f"{base}:{path}"], capture_output=True)
    changes.append({"path": path, "before_sha256": sha(old) if old is not None else None,
                    "after_sha256": sha(new) if new is not None else None,
                    "before_matches_base_commit": committed.returncode == 0 and committed.stdout == old if old is not None else committed.returncode != 0})
    patch.extend(difflib.unified_diff(old.decode().splitlines(True) if old else [],
                                    new.decode().splitlines(True) if new else [],
                                    fromfile="a/" + path if old is not None else "/dev/null",
                                    tofile="b/" + path if new is not None else "/dev/null"))
patch_path = out / "changes.patch"
patch_path.write_text("".join(patch))
with tempfile.TemporaryDirectory(prefix="nuvia-task-delta-") as folder:
    temp = Path(folder)
    shutil.copytree(before, temp / prefix)
    for flags in [("--check",), (), ("--reverse", "--check"), ("--reverse",)]:
        subprocess.run(["git", "apply", *flags, str(patch_path)], cwd=temp, check=True)
    assert all((temp / prefix / p.name).read_bytes() == p.read_bytes() for p in before.iterdir() if p.is_file())
    assert sorted(p.name for p in (temp / prefix).iterdir()) == sorted(p.name for p in before.iterdir())

manifest = {"purpose": "Existing Replit studio review task-add/unknown-time delta only",
            "base_commit": base, "developer_defa19d_compatibility": "NOT VERIFIED",
            "apply_reverse_temp_snapshot": "PASS", "files": changes}
(out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
guide = f"""# NUVIA 작업대 · 추가 시 최소 계획 패치

## 적용 대상과 보호
이 패치는 이 Replit의 기존 studio 검토본에만 적용하는 증분입니다. 공식 NUVIA PLANNER에 바로 덮어쓰는 패치가 아닙니다.
작업 시작 기준 commit: {base}
실제 적용 기준은 manifest.json의 변경 전 파일 해시입니다. 개발자 최신 결과지 연동본 defa19d와의 호환성은 검증하지 않았습니다.
기존 기준본·B형·enhancement·personal-monthly·결과지·서버 계약·다른 프로그램 소스는 수정하지 않았습니다.
신규 서버, 인증, 서버 동기화, 배포, push 또는 main 병합은 하지 않았습니다.

## 기능 변경
- 직접 추가·첫 과제·최근 재사용: 동일 폼에서 제목, 학습/생활/업무/기타, 선택 과목, 10/25/45/직접/미정.
- 중고생은 학습 제안, 대학/성인은 최근 명시적 선택을 제안. 선택·복사 자체는 수행 근거가 아닙니다.
- 날짜·시작·범위·첫 행동·준비물·단계는 선택형 접기. 기존 수정·주간·반복·보관함 기능 보존.
- 저장한 실제 시간/범위 결정이 있으면 같은 회차에서 계획 확인을 또 요구하지 않습니다. 목표별 필수 행동 및 실행 종료 조건은 유지합니다.
- 시간 미정은 합산/시간예측 비교에서 제외하며 경과 시간으로 실행합니다. 일시정지 제외 실측, 미정 개수 별도 표시.
- 원본 시간 없는 다음달/목표지도 파생 과제도 임의 15/20분 대신 미정으로 생성합니다. 이 승인 화면 자체를 새 마법사로 바꾸지는 않았습니다.

## 데이터 및 백업 주의
기존 양수 시간 기록은 변환하지 않습니다. 미정은 이 로컬 검토본에서만 명시적인 부가 표식과 0 sentinel로 보관합니다.
기존 공통 양수 스키마 검사는 임시 검증 사본에서만 수행하며 가짜 양수는 저장하지 않습니다. 서버 전송 계약을 변경한 것이 아닙니다.
미정 실행은 연결 표식·실행 ID·문맥을 함께 검사합니다. 기존 양수 백업을 새 검토본에서 읽을 수 있습니다.
반대로 새 선택 필드/미정이 포함된 백업을 이전 미지원 버전이 읽는다고 보장하지 않습니다.
코드 되돌리기 전에 새 기록 전체를 별도 백업하고 보관하세요. 코드만 되돌리면 구버전의 엄격한 검증에서 새 데이터 읽기가 거부될 수 있습니다.
이전 백업을 복원한다면 생성 이후 기록이 대체되는 범위를 확인하고 사용자 승인을 받아야 합니다. 새 데이터를 임의로 25분 등으로 변환하지 마세요.
백업은 읽기 보고서나 서버 동기화가 아닙니다. 개인 메모 등이 들어갈 수 있으므로 외부 전달 전 확인하세요.

## 적용 전 확인 — 불일치하면 중단
1. 별도 작업 브랜치/복사 환경과 사용자 개인 백업을 준비합니다. 운영본에서 시험하지 않습니다.
2. 압축은 별도 폴더에 풉니다. 소스 전체를 덮어쓰지 않습니다.
3. manifest의 모든 변경 전 해시와 base를 확인합니다. 이미 새 해시라면 중복 적용하지 않습니다.
4. 프로젝트 루트에서 git apply --check /별도폴더/changes.patch
5. 충돌이나 해시 불일치가 있으면 중단하고 최신 개발자 브랜치와 수동 대조합니다. --force/무조건 --3way를 사용하지 않습니다.
6. 일치한 경우에만 git apply /별도폴더/changes.patch 후 별도 환경에서 타입·빌드·브라우저 검수합니다.
7. tools의 테스트는 현재 Replit 모노레포용입니다. task-add-check는 QA에 동봉한 이전 합성 상태를 generated-artifacts/nuvia-task-add/old-browser-state.json에 두고 실행합니다.

## 되돌리기
사용자 데이터 백업을 먼저 보관한 다음 정확히 적용 직후의 코드 상태에서만 git apply --reverse --check changes.patch를 확인합니다.
추가 변경이 있거나 확인에 실패하면 중단합니다. 확인 성공 후 별도 환경에서만 git apply --reverse changes.patch를 검토합니다.
임시 사본에서 정방향 check/적용/역방향 check/적용 및 원본 바이트 일치는 검증했습니다. 외부 최신 개발자 소스는 검증하지 않았습니다.
원래 정상 데모 및 이전 ZIP/보고서는 별도로 유지합니다.
"""
(out / "APPLY_ROLLBACK.md").write_text(guide)
rows = [
    ("최소 추가·첫 과제·최근 재사용", "작동", "실제 폼·취소·빠른 중복 클릭·원본 보존·상세 접기/언어 전환"),
    ("영역·과목·시간 저장 → 선반 → 작업대", "작동", "4영역/선택 과목/10·25·45·37분, 잘못된 직접값 거부, 자동 시작 없음"),
    ("시간 미정 실행/보고서/로드맵", "작동", "저장 0+명시 표식, 경과 시간·일시정지 제외, 합산·예측 비교 제외, 백업·복원"),
    ("PASS 실제 수행 근거", "작동", "기본값/복사/미정/직접 시작 불인정; 실제 결정·필수 행동·종료 후 집계; 회차별 확인"),
    ("기존 작업대·보관·월간·5활동", "회귀 검사 통과", "기존 core 1392, 브라우저 43, 활동/인쇄 29; 새 core48·입력 브라우저41"),
    ("다국어", "일부", "기존 번역 보존. 신규 폼 한/영 및 입력 유지 확인. RTL 기존 화면360 확인. 크메르어/아랍어 신규 폼 완역·독립 언어 검수 아님"),
    ("실제 결과/인증/동기화/HISTORY 서버", "미연결", "기존 상태 유지, 브라우저 저장. 합성 검토는 실제 권한 보안 검증이 아님"),
    ("기존 기준본 4 불일치", "미해결·이번 미재실행", "기존 저장 로그 257/261: 혼합 단위 1·계획/주의 시작 차단 기대 2·시간 단계 시작 차단 기대 1. 현재 Vitest 실행기 없음. 이 테스트를 완화해 없애지 않음"),
    ("사용자 연구/기기·언어 전체", "미검증", "실제 학생 연구·4주 추적·실물 프린터·스크린리더·모든 브라우저·새 폼 RTL/크메르어 완전 검수는 아님"),
]
origin = "https://" + os.environ["REPLIT_DEV_DOMAIN"] + "/studio.html"
doc = '<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>NUVIA 최소 계획 추가 검수</title><style>body{font:16px/1.65 system-ui;color:#172541;background:#f5f1e5;margin:24px auto;max-width:1100px;padding:18px}h1,h2{line-height:1.3}table{width:100%;border-collapse:collapse;background:white}td,th{border:1px solid #bbb;padding:12px;text-align:left}img{display:block;max-width:100%;height:auto;border:1px solid #aaa;margin:12px 0}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:white;padding:18px}a{color:#124d96}@media(max-width:500px){body{margin:0;padding:12px}td,th{padding:6px;font-size:13px}}</style>'
doc += '<h1>NUVIA · 추가 시 최소 계획 검수</h1><p>2026-10-20 · 기존 작업대 검토본의 기능 보강 · 운영 배포 없음</p>'
doc += f'<p><a href="{html.escape(origin)}">현재 검토 화면 직접 실행</a> — HTTP 200 확인. 임시 미리보기 서버가 종료되면 열리지 않습니다.</p>'
doc += '<p>처음 방문: 중학생/고등학생/대학·성인 선택 → 간단한 첫 과제 폼. 기존 기록이 있으면 지금/계획에서 할 일 추가. 저장 → 네임택 선택 → 작업대 올리기 → 별도 시작. 아직 모르겠어요는 남은 시간 대신 경과 시간입니다.</p><table><tr><th>항목</th><th>상태</th><th>근거·한계</th></tr>'
doc += "".join("<tr>"+"".join("<td>"+html.escape(x)+"</td>" for x in row)+"</tr>" for row in rows)+"</table>"
doc += '<h2>실제 브라우저 캡처</h2><p>합성 QA 자료입니다. 생성 이미지가 아닙니다. 첫 폼 360 화면은 스크롤 중 한 화면이며 하단 저장/취소는 세로 스크롤로 접근합니다.</p>'
for name in ["add-form-1440", "add-form-360", "shelf-1440", "desk-1440", "desk-360", "roadmap-1440"]:
    image = root / f"screenshots/task-add/{name}.png"
    doc += f'<h3>{html.escape(name)}</h3><img alt="{html.escape(name)} 실제 캡처" src="data:image/png;base64,{base64.b64encode(image.read_bytes()).decode()}">'
doc += '<h2>현재 실행 로그 요약</h2><pre>'
for name in ["core", "previous-studio", "browser", "studio-browser", "activity-browser", "types", "build"]:
    lines = (out / f"{name}.log").read_text().strip().splitlines()
    doc += html.escape(name + ": " + lines[-1]) + "\n"
doc += '</pre><h2>적용·되돌리기 안내</h2><pre>'+html.escape(guide)+'</pre><h2>변경 파일</h2><pre>'+html.escape("\n".join(x["path"] for x in changes))+'</pre></html>'
report = out / "NUVIA_TASK_ADD_QA.html"
report.write_text(doc)
archive = out / f"NUVIA_STUDIO_TASK_ADD_{base[:8]}.zip"
with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as z:
    for name in ["changes.patch", "manifest.json", "APPLY_ROLLBACK.md", report.name]:
        z.write(out / name, name)
    for name in ["core", "previous-studio", "browser", "studio-browser", "activity-browser", "types", "build", "protection"]:
        z.write(out / f"{name}.log", f"QA/{name}.log")
    z.write(out / "old-browser-state.json", "QA/old-browser-state.json")
    for name in ["browser.mjs", "activity-browser.mjs", "task-add-check.ts", "task-add-browser.mjs"]:
        z.write(root / "tools/nuvia-studio" / name, f"tools/nuvia-studio/{name}")
    for image in (root / "screenshots/task-add").glob("*.png"):
        z.write(image, f"captures/{image.name}")
print(json.dumps({"archive": str(archive.relative_to(root)), "report": str(report.relative_to(root)),
                  "changed_source_files": len(changes), "base": base, "all_before_match_base": all(x["before_matches_base_commit"] for x in changes),
                  "apply_reverse": "PASS"}, ensure_ascii=False))
