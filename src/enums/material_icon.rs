use druid::widget::{Svg, SvgData};

pub enum MaterialIcon {
    LastPage,
}

impl MaterialIcon {
    pub fn load(&self) -> Svg {
        let svg_str = self.load_str();
        let svg_data = svg_str.parse::<SvgData>().unwrap();
        Svg::new(svg_data)
    }

    fn load_str(&self) -> &'static str {
        match self {
            MaterialIcon::LastPage => include_str!("../../assets/svg/last_page.svg"),
        }
    }
}
