use druid::widget::{Svg, SvgData};

pub enum MaterialIcon {
    BorderColor,
    LastPage,
    PlaylistAdd,
    Settings,
    Tune,
}

impl MaterialIcon {
    pub fn load(&self) -> Svg {
        let svg_str = self.load_str();
        let svg_data = svg_str.parse::<SvgData>().unwrap();
        Svg::new(svg_data)
    }

    fn load_str(&self) -> &'static str {
        match self {
            MaterialIcon::BorderColor => include_str!("../../assets/svg/border_color.svg"),
            MaterialIcon::LastPage => include_str!("../../assets/svg/last_page.svg"),
            MaterialIcon::PlaylistAdd => include_str!("../../assets/svg/playlist_add.svg"),
            MaterialIcon::Settings => include_str!("../../assets/svg/settings.svg"),
            MaterialIcon::Tune => include_str!("../../assets/svg/tune.svg"),
        }
    }
}
