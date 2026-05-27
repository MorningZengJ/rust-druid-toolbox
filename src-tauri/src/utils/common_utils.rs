use std::path::Path;

pub struct CommonUtils;

impl CommonUtils {
    pub fn parent_path(path: &str) -> String {
        Path::new(path)
            .parent()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|| path.to_string())
    }

    pub fn join_path(path: &str, name: &str) -> String {
        Path::new(path)
            .join(name)
            .to_string_lossy()
            .to_string()
    }
}

/// 自然排序比较：将字符串拆分为文本和数字部分，数字部分按数值比较
pub fn natural_compare(a: &str, b: &str) -> std::cmp::Ordering {
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
