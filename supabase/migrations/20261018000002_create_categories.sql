-- Stage 3: categories (two levels, readable by signed-in users, no client writes)

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories(id) on delete cascade,
  slug text not null unique,
  name_ka text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index categories_parent_id_idx on public.categories (parent_id);

alter table public.categories enable row level security;

create policy categories_select_authenticated on public.categories
  for select to authenticated using (true);

revoke all on public.categories from anon, public;
grant select on public.categories to authenticated;

insert into public.categories (slug, name_ka, sort_order) values
  ('auto', 'ავტო მომსახურება', 0),
  ('repair', 'რემონტი და მშენებლობა', 10),
  ('cleaning', 'დასუფთავება', 20),
  ('moving', 'გადაზიდვა', 30),
  ('driver', 'მძღოლი', 40),
  ('care', 'ძიძა და მოვლა', 50),
  ('beauty', 'სილამაზე და თავის მოვლა', 60),
  ('health', 'ჯანმრთელობა', 70),
  ('legal', 'იურიდიული და ბუღალტერია', 80),
  ('translation', 'თარგმანი', 90),
  ('it-design', 'IT და დიზაინი', 100),
  ('teaching', 'სწავლება', 110),
  ('events-food', 'ივენთები და კვება', 120),
  ('general-work', 'ზოგადი სამუშაო', 130),
  ('other', 'სხვა', 140);

insert into public.categories (parent_id, slug, name_ka, sort_order)
select p.id, v.slug, v.name_ka, v.sort_order
from (values
  ('auto', 'auto--diagnostics', 'არ ვიცი რა გაუფუჭდა (დიაგნოსტიკა)', 0),
  ('auto', 'auto--general-mechanic', 'უნივერსალური მექანიკოსი', 10),
  ('auto', 'auto--engine', 'ძრავი და გადაცემათა კოლოფი', 20),
  ('auto', 'auto--electrical', 'ელექტრიკა და აკუმულატორი', 30),
  ('auto', 'auto--brakes-suspension', 'მუხრუჭები და ხოდოვა', 40),
  ('auto', 'auto--hvac', 'კონდიციონერი და გათბობა', 50),
  ('auto', 'auto--tires', 'საბურავები და ბორბლები', 60),
  ('auto', 'auto--body-paint', 'კუზოვი და შეღებვა', 70),
  ('auto', 'auto--oil', 'ზეთის შეცვლა', 80),
  ('auto', 'auto--towing', 'ევაკუატორი', 90),
  ('auto', 'auto--detailing', 'დეტეილინგი და სარეცხი', 100),
  ('auto', 'auto--pre-purchase', 'მანქანის შემოწმება ყიდვამდე', 110),
  ('repair', 'repair--general-repair', 'ყველაფრის მკეთებელი (ზოგადი რემონტი)', 0),
  ('repair', 'repair--plumbing', 'სანტექნიკა', 10),
  ('repair', 'repair--electric', 'ელექტრო', 20),
  ('repair', 'repair--tile', 'კაფელი', 30),
  ('repair', 'repair--painting', 'მალიარი', 40),
  ('repair', 'repair--carpentry', 'ხუროობა და ავეჯი', 50),
  ('repair', 'repair--flooring', 'იატაკი', 60),
  ('repair', 'repair--roofing', 'სახურავი', 70),
  ('repair', 'repair--hvac-home', 'გათბობა და კონდიცირება', 80),
  ('repair', 'repair--appliance', 'ტექნიკის შეკეთება', 90),
  ('cleaning', 'cleaning--home-cleaning', 'სახლის დასუფთავება', 0),
  ('cleaning', 'cleaning--office-cleaning', 'ოფისის დასუფთავება', 10),
  ('cleaning', 'cleaning--move-out-cleaning', 'გადასვლის შემდეგ', 20),
  ('cleaning', 'cleaning--carpet-furniture', 'ხალიჩა და ავეჯი', 30),
  ('cleaning', 'cleaning--windows', 'ფანჯრები', 40),
  ('cleaning', 'cleaning--yard-snow', 'ეზო და თოვლის გაწმენდა', 50),
  ('moving', 'moving--home-moving', 'ბინის გადაზიდვა', 0),
  ('moving', 'moving--furniture-delivery', 'ავეჯის ტრანსპორტირება', 10),
  ('moving', 'moving--van-cargo', 'ფურგონი და ტვირთი', 20),
  ('moving', 'moving--loading-help', 'დახმარება ტვირთვაში', 30),
  ('moving', 'moving--junk-removal', 'ნაგვის გატანა', 40),
  ('driver', 'driver--personal-driver', 'პირადი მძღოლი', 0),
  ('driver', 'driver--airport', 'აეროპორტში გადაყვანა', 10),
  ('driver', 'driver--long-distance', 'შორ მანძილზე', 20),
  ('driver', 'driver--care-rides', 'ბავშვის ან ხანდაზმულის გადაყვანა', 30),
  ('driver', 'driver--driver-with-car', 'მძღოლი საკუთარი მანქანით', 40),
  ('care', 'care--nanny', 'ძიძა', 0),
  ('care', 'care--child-care', 'ბავშვის მოვლა', 10),
  ('care', 'care--elder-care', 'ხანდაზმულის მოვლა', 20),
  ('care', 'care--patient-care', 'ავადმყოფის მოვლა', 30),
  ('care', 'care--home-helper', 'დამხმარე სახლში', 40),
  ('beauty', 'beauty--hair', 'თმა და სტილისტი', 0),
  ('beauty', 'beauty--barber', 'ბარბერი', 10),
  ('beauty', 'beauty--nails', 'მანიკური და პედიკური', 20),
  ('beauty', 'beauty--brows-lashes', 'წარბები და წამწამები', 30),
  ('beauty', 'beauty--makeup', 'მაკიაჟი', 40),
  ('beauty', 'beauty--massage', 'მასაჟი', 50),
  ('health', 'health--doctor', 'ექიმი', 0),
  ('health', 'health--dentist', 'სტომატოლოგი', 10),
  ('health', 'health--physio', 'ფიზიოთერაპია', 20),
  ('health', 'health--fitness', 'ვარჯიში და ტრენერი', 30),
  ('health', 'health--nutrition', 'კვების სპეციალისტი', 40),
  ('legal', 'legal--lawyer', 'იურისტი', 0),
  ('legal', 'legal--accountant', 'ბუღალტერი და გადასახადები', 10),
  ('legal', 'legal--documents', 'დოკუმენტების შევსება', 20),
  ('legal', 'legal--notary', 'ნოტარიუსი', 30),
  ('legal', 'legal--insurance', 'დაზღვევა', 40),
  ('translation', 'translation--ka-en', 'ქართულ-ინგლისური', 0),
  ('translation', 'translation--ka-ru', 'ქართულ-რუსული', 10),
  ('translation', 'translation--doc-translation', 'დოკუმენტების თარგმანი', 20),
  ('translation', 'translation--interpreter', 'თარჯიმანი თან წასაყოლად', 30),
  ('it-design', 'it-design--website', 'ვებსაიტი', 0),
  ('it-design', 'it-design--mobile-app', 'მობილური აპლიკაცია', 10),
  ('it-design', 'it-design--graphic-design', 'გრაფიკული დიზაინი', 20),
  ('it-design', 'it-design--computer-repair', 'კომპიუტერის შეკეთება', 30),
  ('it-design', 'it-design--phone-repair', 'ტელეფონის შეკეთება', 40),
  ('it-design', 'it-design--social-media', 'სოციალური მედია', 50),
  ('teaching', 'teaching--english', 'ინგლისური ენა', 0),
  ('teaching', 'teaching--georgian', 'ქართული ენა', 10),
  ('teaching', 'teaching--school-subjects', 'სასკოლო საგნები', 20),
  ('teaching', 'teaching--music', 'მუსიკა', 30),
  ('teaching', 'teaching--driving-test', 'მართვის გამოცდის მომზადება', 40),
  ('events-food', 'events-food--photo-video', 'ფოტო და ვიდეო', 0),
  ('events-food', 'events-food--host', 'წამყვანი და თამადა', 10),
  ('events-food', 'events-food--music-dj', 'მუსიკოსი და DJ', 20),
  ('events-food', 'events-food--catering', 'კვება და სუფრა', 30),
  ('events-food', 'events-food--cakes', 'ტორტები და ტკბილეული', 40),
  ('events-food', 'events-food--decor', 'დეკორაცია', 50),
  ('general-work', 'general-work--helper', 'დამხმარე მუშა', 0),
  ('general-work', 'general-work--delivery', 'მიტანა', 10),
  ('general-work', 'general-work--warehouse', 'საწყობი', 20),
  ('general-work', 'general-work--restaurant', 'რესტორანი და სამზარეულო', 30),
  ('general-work', 'general-work--temp-work', 'დროებითი სამუშაო', 40)
) as v(parent_slug, slug, name_ka, sort_order)
join public.categories p on p.slug = v.parent_slug;
