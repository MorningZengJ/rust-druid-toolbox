use ab_glyph::{Font, FontRef, PxScale, Point};
use image::RgbaImage;

static FONT_BYTES: &[u8] = include_bytes!("../../fonts/Consolas.ttf");

fn draw_glyph_pixel(
    image: &mut RgbaImage,
    px: i32,
    py: i32,
    coverage: f32,
    color: (u8, u8, u8),
) {
    if px < 0 || py < 0 {
        return;
    }
    let px = px as u32;
    let py = py as u32;
    if px >= image.width() || py >= image.height() {
        return;
    }

    let alpha = (coverage * 255.0).round().clamp(0.0, 255.0) as u8;
    if alpha == 0 {
        return;
    }

    let bg = image.get_pixel(px, py);
    let fg_r = color.0 as f32;
    let fg_g = color.1 as f32;
    let fg_b = color.2 as f32;
    let fg_a = alpha as f32 / 255.0;

    let bg_r = bg[0] as f32;
    let bg_g = bg[1] as f32;
    let bg_b = bg[2] as f32;
    let bg_a = bg[3] as f32 / 255.0;

    let out_a = fg_a + bg_a * (1.0 - fg_a);
    if out_a < 0.001 {
        return;
    }
    let out_r = (fg_r * fg_a + bg_r * bg_a * (1.0 - fg_a)) / out_a;
    let out_g = (fg_g * fg_a + bg_g * bg_a * (1.0 - fg_a)) / out_a;
    let out_b = (fg_b * fg_a + bg_b * bg_a * (1.0 - fg_a)) / out_a;

    image.put_pixel(
        px,
        py,
        image::Rgba([
            out_r.round().clamp(0.0, 255.0) as u8,
            out_g.round().clamp(0.0, 255.0) as u8,
            out_b.round().clamp(0.0, 255.0) as u8,
            (out_a * 255.0).round().clamp(0.0, 255.0) as u8,
        ]),
    );
}

pub fn render_char_to_image(
    image: &mut RgbaImage,
    ch: char,
    cell_x: u32,
    cell_y: u32,
    _cell_width: u32,
    _cell_height: u32,
    color: (u8, u8, u8),
) {
    if ch == ' ' {
        return;
    }

    let font = FontRef::try_from_slice(FONT_BYTES).expect("failed to load embedded font");
    let scale = PxScale::from(10.0);
    let units_per_em = font.units_per_em().unwrap_or(2048.0);
    let ascent = font.ascent_unscaled() * scale.y / units_per_em;

    let glyph_id = font.glyph_id(ch);
    let glyph = glyph_id.with_scale_and_position(
        scale,
        Point {
            x: cell_x as f32,
            y: cell_y as f32 + ascent,
        },
    );

    if let Some(outlined) = font.outline_glyph(glyph) {
        let bounds = outlined.px_bounds();
        let offset_x = bounds.min.x as i32;
        let offset_y = bounds.min.y as i32;
        outlined.draw(|x, y, coverage| {
            draw_glyph_pixel(image, offset_x + x as i32, offset_y + y as i32, coverage, color);
        });
    }
}
