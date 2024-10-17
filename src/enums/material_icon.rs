use druid::widget::{Svg, SvgData};

pub enum MaterialIcon {
    ArrowCircleUp,
    BorderColor,
    // DeleteOutline,
    LastPage,
    PlaylistAdd,
    RemoveCircleOutline,
    Settings,
    // Tune,
}

impl MaterialIcon {
    pub fn load(&self) -> Svg {
        let svg_str = self.load_str();
        let svg_data = svg_str.parse::<SvgData>().unwrap();
        Svg::new(svg_data)
    }

    fn load_str(&self) -> &'static str {
        match self {
            MaterialIcon::ArrowCircleUp => include_str!("../../assets/svg/arrow_circle_up.svg"),
            MaterialIcon::BorderColor => include_str!("../../assets/svg/border_color.svg"),
            // MaterialIcon::DeleteOutline => include_str!("../../assets/svg/delete_outline.svg"),
            MaterialIcon::LastPage => include_str!("../../assets/svg/last_page.svg"),
            MaterialIcon::PlaylistAdd => include_str!("../../assets/svg/playlist_add.svg"),
            MaterialIcon::RemoveCircleOutline => include_str!("../../assets/svg/remove_circle_outline.svg"),
            MaterialIcon::Settings => include_str!("../../assets/svg/settings.svg"),
            // MaterialIcon::Tune => include_str!("../../assets/svg/tune.svg"),
        }
    }
}
