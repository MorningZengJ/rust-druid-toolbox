#[macro_export]
macro_rules! additional_vector {
    () => {{
        let vector = im::Vector::new();
        crate::traits::impl_data::Vector(vector)
    }};
    ($($x:expr), *) => {{
        let mut vector = im::Vector::new();
        $(
            vector.push_back($x);
        )*
        crate::traits::impl_data::Vector(vector)
    }};
    ($($x:expr ,) *) => {{
        let mut vector = im::Vector::new();
        $(
            vector.push_back($x);
        )*
        crate::traits::impl_data::Vector(vector)
    }};
}