use std::path::Path;

/// 列出文件夹中的图片文件路径，按文件名自然排序
#[tauri::command]
pub fn list_images_in_folder(folder_path: String) -> Vec<String> {
    let image_extensions: &[&str] = &["png", "jpg", "jpeg", "bmp", "gif", "webp"];

    let entries = match std::fs::read_dir(&folder_path) {
        Ok(entries) => entries,
        Err(_) => return Vec::new(),
    };

    let mut images: Vec<String> = entries
        .filter_map(|entry| entry.ok())
        .filter(|entry| {
            let file_type = entry.file_type().ok();
            file_type.map(|ft| ft.is_file()).unwrap_or(false)
        })
        .filter_map(|entry| {
            let path = entry.path();
            let ext = path
                .extension()
                .and_then(|e| e.to_str())
                .map(|e| e.to_lowercase());
            if ext.map(|e| image_extensions.contains(&e.as_str())).unwrap_or(false) {
                Some(path.to_string_lossy().to_string())
            } else {
                None
            }
        })
        .collect();

    // 自然排序：将文件名拆分为文本和数字部分进行比较
    images.sort_by(|a, b| {
        let name_a = Path::new(a)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("");
        let name_b = Path::new(b)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("");
        natural_compare(name_a, name_b)
    });

    images
}

/// 自然排序比较：将字符串拆分为文本和数字部分，数字部分按数值比较
fn natural_compare(a: &str, b: &str) -> std::cmp::Ordering {
    let parts_a = split_natural(a);
    let parts_b = split_natural(b);

    for (pa, pb) in parts_a.iter().zip(parts_b.iter()) {
        match (pa, pb) {
            (NaturalPart::Text(sa), NaturalPart::Text(sb)) => {
                let cmp = sa.to_lowercase().cmp(&sb.to_lowercase());
                if cmp != std::cmp::Ordering::Equal {
                    return cmp;
                }
            }
            (NaturalPart::Number(na), NaturalPart::Number(nb)) => {
                let cmp = na.cmp(nb);
                if cmp != std::cmp::Ordering::Equal {
                    return cmp;
                }
            }
            (NaturalPart::Number(_), NaturalPart::Text(_)) => return std::cmp::Ordering::Less,
            (NaturalPart::Text(_), NaturalPart::Number(_)) => return std::cmp::Ordering::Greater,
        }
    }

    parts_a.len().cmp(&parts_b.len())
}

enum NaturalPart {
    Text(String),
    Number(u64),
}

fn split_natural(s: &str) -> Vec<NaturalPart> {
    let mut parts = Vec::new();
    let mut current_text = String::new();
    let mut current_num = String::new();
    let mut in_number = false;

    for ch in s.chars() {
        if ch.is_ascii_digit() {
            if !in_number && !current_text.is_empty() {
                parts.push(NaturalPart::Text(current_text.clone()));
                current_text.clear();
            }
            in_number = true;
            current_num.push(ch);
        } else {
            if in_number && !current_num.is_empty() {
                parts.push(NaturalPart::Number(current_num.parse().unwrap_or(0)));
                current_num.clear();
            }
            in_number = false;
            current_text.push(ch);
        }
    }

    if !current_text.is_empty() {
        parts.push(NaturalPart::Text(current_text));
    }
    if !current_num.is_empty() {
        parts.push(NaturalPart::Number(current_num.parse().unwrap_or(0)));
    }

    parts
}
