use iced::{Element, Size, Subscription, Task};

pub mod route_page;
mod stack_navigator;

pub use stack_navigator::*;

#[derive(Debug, Clone)]
pub enum NavigationAction<RoutePage> {
    Push(RoutePage),
    Replace(RoutePage),
    Pop,
    PopToRoot,
}

impl<RoutePage> NavigationAction<RoutePage> {
    #[allow(dead_code)]
    pub fn task<Message>(self, f: impl Fn(Self) -> Message + Send + Sync + 'static) -> Task<Message>
    where
        Message: 'static + Send,
    {
        Task::done(f(self))
    }
}

pub trait PageComponent<Message> {
    fn init(&self) -> Task<Message> {
        Task::none()
    }

    fn update(&mut self, message: Message) -> Task<Message>;

    fn view(&self) -> Element<'_, Message>;

    fn resize(&mut self, _size: Size) {}

    #[allow(dead_code)]
    fn subscription(&self) -> Subscription<Message> {
        Subscription::none()
    }
}

pub struct MapMessage<P, M1, M2, F, U> {
    page: P,
    mapper: F,
    unwrapper: U,
    _marker: std::marker::PhantomData<M1>,
    _marker2: std::marker::PhantomData<M2>,
}

impl<P, M1, M2, F, U> PageComponent<M2> for MapMessage<P, M1, M2, F, U>
where
    P: PageComponent<M1>,
    F: Fn(M1) -> M2 + Send + Sync + Copy + 'static,
    U: Fn(M2) -> Option<M1> + Send + Sync + Copy + 'static,
    M1: 'static + Send,
    M2: 'static + Send,
{
    fn init(&self) -> Task<M2> {
        self.page.init().map(self.mapper)
    }

    fn update(&mut self, message: M2) -> Task<M2> {
        if let Some(msg) = (self.unwrapper)(message) {
            self.page.update(msg).map(self.mapper)
        } else {
            Task::none()
        }
    }

    fn view(&self) -> Element<'_, M2> {
        self.page.view().map(self.mapper)
    }

    fn resize(&mut self, _size: Size) {
        self.page.resize(_size);
    }

    fn subscription(&self) -> Subscription<M2> {
        self.page.subscription().map(self.mapper)
    }
}

pub trait PageComponentExt<M1>: PageComponent<M1> + Sized {
    fn map_msg<M2, F, U>(self, mapper: F, unwrapper: U) -> MapMessage<Self, M1, M2, F, U>
    where
        F: Fn(M1) -> M2 + Send + Sync + Copy + 'static,
        U: Fn(M2) -> Option<M1> + Send + Sync + Copy + 'static;
}

impl<M1, P: PageComponent<M1>> PageComponentExt<M1> for P {
    fn map_msg<M2, F, U>(self, mapper: F, unwrapper: U) -> MapMessage<Self, M1, M2, F, U>
    where
        F: Fn(M1) -> M2 + Send + Sync + Copy + 'static,
        U: Fn(M2) -> Option<M1> + Send + Sync + Copy + 'static,
    {
        MapMessage {
            page: self,
            mapper,
            unwrapper,
            _marker: std::marker::PhantomData,
            _marker2: std::marker::PhantomData,
        }
    }
}
