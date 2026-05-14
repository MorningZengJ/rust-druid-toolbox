use crate::ternary_operator_let;
use crate::ui::navigation::{PageComponent, PageComponentExt, StackNavigatorMapper};
use crate::ui::{home, settings};

#[derive(Debug, Clone)]
pub enum Message {
    Home(home::Message),
    Settings(settings::Message),
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum RoutePage {
    Home,
    #[allow(dead_code)]
    Settings,
}

impl StackNavigatorMapper for RoutePage {
    type Message = Message;

    fn component(&self) -> Box<dyn PageComponent<Self::Message>> {
        match self {
            RoutePage::Home => Box::new(home::Home::default().map_msg(Message::Home, |m| {
                ternary_operator_let!(Message::Home(m) = m, m)
            })),
            RoutePage::Settings => Box::new(
                settings::Settings::default().map_msg(Message::Settings, |m| {
                    ternary_operator_let!(Message::Settings(m) = m, m)
                }),
            ),
        }
    }
}
